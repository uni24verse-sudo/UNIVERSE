const Journey = require('../models/Journey');
const UserJourneyState = require('../models/UserJourneyState');
const MasterTemplate = require('../models/MasterTemplate');
const ChannelAccount = require('../models/ChannelAccount');
const whatsappMultiDeviceService = require('./whatsappMultiDeviceService');
const emailMultiAccountService = require('./emailMultiAccountService');
const Order = require('../models/Order');

class JourneyEngineService {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
  }

  start() {
    console.log('--- Starting Journey Builder Background Worker ---');
    // Run tick every 30 seconds
    this.intervalId = setInterval(() => this.processScheduledNodes(), 30000);
    // Initial run
    setTimeout(() => this.processScheduledNodes(), 5000);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * Enroll a user into a specific active journey
   */
  async enrollUser(journeyId, { userId, userType = 'Student', name = 'Student', phone = '', email = '', metadata = {}, isTest = false }) {
    try {
      const journey = await Journey.findById(journeyId);
      if (!journey) return null;
      if (!isTest && journey.status !== 'Active') return null;

      // Find initial trigger node
      const triggerNode = journey.nodes.find(n => n.type === 'trigger');
      if (!triggerNode || !triggerNode.nextNodeId) return null;

      const firstActiveNode = journey.nodes.find(n => n.id === triggerNode.nextNodeId);
      if (!firstActiveNode) return null;

      let scheduledTime = new Date();
      if (firstActiveNode.type === 'delay') {
        const delayMs = ((firstActiveNode.config?.delayHours || 0) * 3600 + (firstActiveNode.config?.delayMinutes || 0) * 60) * 1000;
        scheduledTime = new Date(Date.now() + Math.max(delayMs, 1000));
      }

      // Prevent duplicate enrollment for the same order in the same journey
      const orderIdentifier = metadata?.orderId || metadata?.orderNumber;
      if (orderIdentifier) {
        const existingState = await UserJourneyState.findOne({
          journeyId: journey._id,
          status: { $in: ['Pending', 'Waiting_Event'] },
          $or: [
            { 'metadata.orderId': orderIdentifier.toString() },
            { 'metadata.orderNumber': orderIdentifier.toString() }
          ]
        });
        if (existingState) {
          console.log(`[JourneyEngine] Order ${orderIdentifier} already active in "${journey.name}" - skipping duplicate enrollment.`);
          return existingState;
        }
      }

      const state = new UserJourneyState({
        journeyId: journey._id,
        userId: userId || null,
        userType,
        name: name || 'Student',
        phone: phone || '',
        email: email || '',
        metadata: metadata || {},
        currentNodeId: firstActiveNode.id,
        scheduledExecutionTime: scheduledTime,
        status: 'Pending',
        history: [{
          nodeId: triggerNode.id,
          action: 'trigger_fired',
          status: 'Simulated',
          renderedBody: `Trigger event "${journey.triggerType || 'Order Placed'}" fired.`,
          executedAt: new Date()
        }]
      });

      await state.save();
      await Journey.findByIdAndUpdate(journey._id, { $inc: { totalEnrolled: 1 } });
      console.log(`[JourneyEngine] Enrolled user ${name} (${phone}) into "${journey.name}" at node ${firstActiveNode.id}`);

      // Attach populated journey so executeNode can access journey.nodes directly
      state.journeyId = journey;

      // If first node is an immediate action/condition, execute it right away
      if (firstActiveNode.type !== 'delay' && firstActiveNode.type !== 'wait_event') {
        await this.executeNode(state);
      }

      return state;
    } catch (err) {
      console.error('[JourneyEngine] Enrollment Error:', err.message);
      return null;
    }
  }

  /**
   * Fire an event trigger (e.g. 'Order Completed', 'User Registered')
   */
  async triggerEvent(triggerType, userDetails) {
    try {
      const activeJourneys = await Journey.find({ triggerType, status: 'Active' });
      for (const journey of activeJourneys) {
        await this.enrollUser(journey._id, userDetails);
      }
    } catch (err) {
      console.error(`[JourneyEngine] Error firing event "${triggerType}":`, err.message);
    }
  }

  /**
   * Background processor: Find all pending user journey states that are due for execution
   */
  async processScheduledNodes() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const dueStates = await UserJourneyState.find({
        status: 'Pending',
        scheduledExecutionTime: { $lte: now }
      }).limit(50).populate('journeyId');

      for (const state of dueStates) {
        await this.executeNode(state);
      }
    } catch (err) {
      console.error('[JourneyEngine] Worker Execution Error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Resume an active journey waiting on an order event (e.g. 'Order Accepted', 'Order Ready', 'Order Completed', 'Order Rejected')
   */
  async resumeOrderJourney(orderId, eventType, orderDetails = {}) {
    try {
      if (!orderId) return;
      const orderIdStr = orderId.toString();

      const orderNumStr = (orderDetails?.metadata?.orderNumber || orderDetails?.metadata?.orderId || '').toString();

      const query = {
        status: { $in: ['Pending', 'Waiting_Event'] },
        $or: [
          { 'metadata.orderId': orderIdStr },
          { 'metadata.orderNumber': orderIdStr }
        ]
      };
      if (orderNumStr) {
        query.$or.push({ 'metadata.orderId': orderNumStr });
        query.$or.push({ 'metadata.orderNumber': orderNumStr });
      }

      const activeStates = await UserJourneyState.find(query).populate('journeyId');

      for (const state of activeStates) {
        const journey = state.journeyId;
        if (!journey || journey.status !== 'Active') continue;

        const node = journey.nodes.find(n => n.id === state.currentNodeId);
        if (!node) continue;

        // Merge updated metadata
        if (orderDetails?.metadata) {
          state.metadata = { ...(state.metadata || {}), ...orderDetails.metadata };
        }

        let nextNodeId = null;

        // 1. If at wait_event node
        if (node.type === 'wait_event') {
          const targetEvent = (node.config?.eventType || 'order_completed').toLowerCase().replace(/[\s_-]+/g, '');
          const incomingEvent = (eventType || '').toLowerCase().replace(/[\s_-]+/g, '');

          const isDecision = (targetEvent.includes('decision') || targetEvent.includes('accept')) && (incomingEvent.includes('accept') || incomingEvent.includes('reject'));
          const isReady = (targetEvent.includes('ready')) && incomingEvent.includes('ready');
          const isCompleted = (targetEvent.includes('complete') || targetEvent.includes('handover')) && incomingEvent.includes('complete');
          const isExact = targetEvent === incomingEvent;

          if (isDecision || isReady || isCompleted || isExact) {
            if (isDecision || targetEvent.includes('decision')) {
              nextNodeId = (incomingEvent.includes('accept') || incomingEvent.includes('cooking') || incomingEvent.includes('confirm'))
                ? (node.trueNodeId || node.nextNodeId)
                : (node.falseNodeId || null);
            } else {
              nextNodeId = node.nextNodeId;
            }
          }
        } else if (node.type === 'condition') {
          const cond = (node.config?.conditionType || '').toLowerCase();
          const incomingEvent = (eventType || '').toLowerCase().replace(/[\s_-]+/g, '');
          if (cond.includes('decision') || cond.includes('accept') || cond.includes('status')) {
            const isAccepted = incomingEvent.includes('accept') || incomingEvent.includes('cooking') || incomingEvent.includes('confirm') || incomingEvent.includes('ready') || incomingEvent.includes('complete');
            nextNodeId = isAccepted ? (node.trueNodeId || node.nextNodeId) : (node.falseNodeId || null);
          }
        }

        if (nextNodeId) {
          console.log(`[JourneyEngine] Order ${orderIdStr} event "${eventType}" triggered advancement from [${node.label}] to node ${nextNodeId}`);
          const nextNode = journey.nodes.find(n => n.id === nextNodeId);
          if (nextNode) {
            state.currentNodeId = nextNode.id;
            state.status = 'Pending';
            state.scheduledExecutionTime = new Date();
            await state.save();
            // Execute immediately without delay
            await this.executeNode(state);
          }
        }
      }
    } catch (err) {
      console.error('[JourneyEngine] Error resuming order journey:', err.message);
    }
  }

  /**
   * Execute single node for a user state
   */
  async executeNode(state) {
    try {
      // Ensure journey is fully populated (not just an ObjectId reference)
      let journey = state.journeyId;
      if (!journey || !journey.nodes) {
        // journeyId is an ObjectId ref - need to populate it
        await state.populate('journeyId');
        journey = state.journeyId;
      }
      if (!journey || journey.status !== 'Active') {
        state.status = 'Cancelled';
        await state.save();
        return;
      }

      const node = journey.nodes.find(n => n.id === state.currentNodeId);
      if (!node) {
        state.status = 'Completed';
        await state.save();
        await Journey.findByIdAndUpdate(journey._id, { $inc: { totalCompleted: 1 } });
        return;
      }

      console.log(`[JourneyEngine] Executing Node [${node.type}] "${node.label}" for user ${state.phone || state.email}...`);

      let nextNodeId = null;

      // Handle Node Types
      if (node.type === 'action') {
        await this.performActionNode(node, state);
        nextNodeId = node.nextNodeId;
      } else if (node.type === 'condition') {
        const passed = await this.evaluateCondition(node.config?.conditionType, state, node.config || {});
        nextNodeId = passed ? (node.trueNodeId || node.nextNodeId) : (node.falseNodeId || null);
      } else if (node.type === 'delay') {
        // If delay just finished, advance to next
        nextNodeId = node.nextNodeId;
      } else if (node.type === 'wait_event') {
        // Pause here and wait for real-time order event trigger
        state.status = 'Waiting_Event';
        await state.save();
        console.log(`[JourneyEngine] User ${state.phone} paused at [${node.label}], waiting for event: ${node.config?.eventType || 'order_event'}`);
        return;
      } else if (node.type === 'tag') {
        // Customer profile tag
        console.log(`[JourneyEngine] Tagged user ${state.phone} with tag "${node.config?.tagName || 'VIP'}"`);
        nextNodeId = node.nextNodeId;
      }

      // Check if journey is finished
      if (!nextNodeId) {
        state.status = 'Completed';
        await state.save();
        await Journey.findByIdAndUpdate(journey._id, { $inc: { totalCompleted: 1 } });
        console.log(`[JourneyEngine] User ${state.phone} completed journey "${journey.name}"`);
        return;
      }

      // Advance to next node
      const nextNode = journey.nodes.find(n => n.id === nextNodeId);
      if (!nextNode) {
        state.status = 'Completed';
        await state.save();
        await Journey.findByIdAndUpdate(journey._id, { $inc: { totalCompleted: 1 } });
        return;
      }

      state.currentNodeId = nextNode.id;

      if (nextNode.type === 'delay') {
        const delayMs = ((nextNode.config?.delayDays || 0) * 86400 + (nextNode.config?.delayHours || 0) * 3600 + (nextNode.config?.delayMinutes || 0) * 60) * 1000;
        state.scheduledExecutionTime = new Date(Date.now() + Math.max(delayMs, 1000));
        state.status = 'Pending';
        state.history.push({
          nodeId: nextNode.id,
          action: 'delay_scheduled',
          status: 'Scheduled',
          renderedBody: `Scheduled wait: ${nextNode.label || 'Timer delay'} (executes at ${state.scheduledExecutionTime.toLocaleTimeString()})`,
          executedAt: new Date()
        });
      } else if (nextNode.type === 'wait_event') {
        state.status = 'Waiting_Event';
        state.history.push({
          nodeId: nextNode.id,
          action: 'waiting_order_event',
          status: 'Listening 24/7',
          renderedBody: `Workflow standing by at [${nextNode.label}]. Awaiting real-time event "${nextNode.config?.eventType || 'Order Event'}" to advance.`,
          executedAt: new Date()
        });
      } else {
        state.scheduledExecutionTime = new Date(); // Execute immediately
        state.status = 'Pending';
      }

      await state.save();

      // If next node is immediate action or condition, execute immediately
      if (nextNode.type === 'action' || nextNode.type === 'condition' || nextNode.type === 'tag') {
        await this.executeNode(state);
      }

    } catch (err) {
      console.error(`[JourneyEngine] Error executing node ${state.currentNodeId}:`, err.message);
      state.status = 'Failed';
      await state.save();
    }
  }

  /**
   * Perform dispatch action (WhatsApp or Email)
   */
  async performActionNode(node, state) {
    const { 
      channel, 
      channelAccountId, 
      masterTemplateId, 
      customBody, 
      subject: customSubject, 
      btn1Text, 
      btn2Text, 
      btn3Text,
      ctaText: customCtaText, 
      ctaLink: customCtaLink,
      headerMediaUrl: customHeaderMediaUrl 
    } = node.config || {};

    // Determine active channel (default to WhatsApp)
    const activeChannel = channel || 'whatsapp';

    let template = null;
    if (masterTemplateId) {
      template = await MasterTemplate.findById(masterTemplateId).catch(() => null);
    }

    // Compile dynamic tags with fallback message
    const meta = state.metadata || {};
    let rawBody = customBody || template?.body || '👋 Hi {{name}}, welcome to UniVerse! Order fresh food easily on campus at https://universeorder.co.in 🍔🍕';

    let body = rawBody
      .replace(/{{name}}/gi, state.name || 'Student')
      .replace(/{{phone}}/gi, state.phone || '')
      .replace(/{{email}}/gi, state.email || '')
      .replace(/{{orderId}}/gi, meta.orderId || meta.orderNumber || '')
      .replace(/{{orderNumber}}/gi, meta.orderNumber || meta.orderId || '')
      .replace(/{{storeName}}/gi, meta.storeName || 'UniVerse Campus')
      .replace(/{{amount}}/gi, meta.amount ? `₹${meta.amount}` : '');

    if (activeChannel === 'whatsapp' && state.phone) {
      let slotIndex = 1;
      if (channelAccountId) {
        const channelAccount = await ChannelAccount.findById(channelAccountId).catch(() => null);
        if (channelAccount?.slotIndex) slotIndex = channelAccount.slotIndex;
      }

      // Construct dynamic buttons if customized
      let buttons = template?.buttons || [];
      if (btn1Text || btn2Text || btn3Text) {
        buttons = [];
        if (btn1Text) buttons.push({ buttonId: 'btn_1', text: btn1Text, buttonText: { displayText: btn1Text }, type: 1 });
        if (btn2Text) buttons.push({ buttonId: 'btn_2', text: btn2Text, buttonText: { displayText: btn2Text }, type: 1 });
        if (btn3Text) buttons.push({ buttonId: 'btn_3', text: btn3Text, buttonText: { displayText: btn3Text }, type: 1 });
      }

      const payload = {
        headerType: customHeaderMediaUrl ? 'IMAGE' : (template?.headerType || 'NONE'),
        headerMediaUrl: customHeaderMediaUrl || template?.headerMediaUrl,
        body,
        footer: template?.footer || 'UniVerse Automated Engine',
        buttons
      };

      await whatsappMultiDeviceService.sendMessage(slotIndex, state.phone, payload);

      state.history.push({
        nodeId: node.id,
        action: 'whatsapp_sent',
        channelAccountId,
        status: 'Delivered',
        recipient: state.phone,
        renderedBody: body,
        slotIndex,
        executedAt: new Date()
      });
    } else if (channel === 'email' && state.email) {
      const finalSubject = (customSubject || template?.subject || template?.name || 'UniVerse Campus Update')
        .replace(/{{name}}/gi, state.name || 'Student')
        .replace(/{{storeName}}/gi, meta.storeName || 'UniVerse Campus');

      const ctaText = customCtaText || template?.emailCtaText || 'View in UniVerse';
      const ctaUrl = customCtaLink || template?.emailCtaUrl || 'https://universe.app';
      const heroImage = customHeaderMediaUrl || template?.emailHeroImageUrl;

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 2rem; background: #ffffff; color: #0f172a; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          ${heroImage ? `<img src="${heroImage}" style="width: 100%; max-height: 240px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem;" />` : ''}
          <h2 style="color: #ef4123; margin-top: 0; font-size: 1.4rem;">${finalSubject}</h2>
          <div style="line-height: 1.6; font-size: 1rem; color: #334155;">${body.replace(/\n/g, '<br/>')}</div>
          ${ctaText ? `<div style="margin: 2rem 0; text-align: center;"><a href="${ctaUrl}" style="background: linear-gradient(135deg, #ef4123, #ea580c); color: white; padding: 0.9rem 2.2rem; border-radius: 100px; text-decoration: none; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(239, 65, 35, 0.3);">${ctaText}</a></div>` : ''}
          <div style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-top: 2.5rem; border-top: 1px solid #f1f5f9; padding-top: 1rem;">UniVerse Campus Platform • Automated Notification</div>
        </div>
      `;

      await emailMultiAccountService.sendEmail(channelAccountId, {
        to: state.email,
        subject: finalSubject,
        html: htmlBody,
        text: body
      });

      state.history.push({
        nodeId: node.id,
        action: 'email_sent',
        channelAccountId,
        status: 'Delivered',
        recipient: state.email,
        renderedBody: body,
        executedAt: new Date()
      });
    }
  }

  /**
   * Evaluate conditional node branch
   */
  async evaluateCondition(conditionType, state, nodeConfig = {}) {
    if (!conditionType || conditionType === 'none') return true;

    if (conditionType === 'order_amount_gt') {
      const amount = Number(state.metadata?.amount || 0);
      const target = Number(nodeConfig.conditionValue || 0);
      return amount > target;
    }

    if (conditionType === 'has_ordered_in_last_24h' && state.phone) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await Order.countDocuments({
        customerPhone: state.phone,
        createdAt: { $gte: oneDayAgo },
        status: { $in: ['Completed', 'Confirmed', 'Cooking', 'Ready'] }
      });
      return count > 0;
    }

    if (conditionType === 'has_completed_orders' && state.phone) {
      const count = await Order.countDocuments({
        customerPhone: state.phone,
        status: 'Completed'
      });
      return count > 0;
    }

    return true;
  }
}

const journeyEngineService = new JourneyEngineService();
module.exports = journeyEngineService;

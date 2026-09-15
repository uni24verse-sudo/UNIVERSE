const crypto = require('crypto');
const prisma = require('../config/prisma');
const whatsappMultiDeviceService = require('./whatsappMultiDeviceService');
const emailMultiAccountService = require('./emailMultiAccountService');

// Safe JSON array unpacker (handles Prisma JSONB, strings, or raw objects)
function parseNodes(rawNodes) {
  if (Array.isArray(rawNodes)) return rawNodes;
  if (typeof rawNodes === 'string') {
    try {
      const parsed = JSON.parse(rawNodes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Safe metadata unpacker (handles nested strings or objects)
function getMetadata(obj) {
  if (!obj) return {};
  const m = obj.metadata !== undefined ? obj.metadata : obj;
  if (typeof m === 'string') {
    try {
      return JSON.parse(m);
    } catch (e) {
      return {};
    }
  }
  return m && typeof m === 'object' ? m : {};
}

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
      const journey = await prisma.journey.findUnique({
        where: { id: String(journeyId) }
      });
      if (!journey) return null;
      if (!isTest && journey.status !== 'Active') return null;

      const nodes = parseNodes(journey.nodes);

      // Find initial trigger node
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode || !triggerNode.nextNodeId) return null;

      const firstActiveNode = nodes.find(n => n.id === triggerNode.nextNodeId);
      if (!firstActiveNode) return null;

      let scheduledTime = new Date();
      if (firstActiveNode.type === 'delay') {
        const delayMs = ((firstActiveNode.config?.delayHours || 0) * 3600 + (firstActiveNode.config?.delayMinutes || 0) * 60) * 1000;
        scheduledTime = new Date(Date.now() + Math.max(delayMs, 1000));
      }

      // Prevent duplicate enrollment for the same order in the same journey
      const orderIdentifier = metadata?.orderId || metadata?.orderNumber;
      if (orderIdentifier) {
        const activeStates = await prisma.userJourneyState.findMany({
          where: {
            journeyId: journey.id,
            status: { in: ['Pending', 'Waiting_Event'] }
          }
        });
        const existingState = activeStates.find(s => {
          const m = getMetadata(s);
          return String(m.orderId || '') === String(orderIdentifier) || String(m.orderNumber || '') === String(orderIdentifier);
        });

        if (existingState) {
          console.log(`[JourneyEngine] Order ${orderIdentifier} already active in "${journey.name}" - skipping duplicate enrollment.`);
          return existingState;
        }
      }

      const stateId = crypto.randomUUID();
      const initialHistory = [{
        nodeId: triggerNode.id,
        action: 'trigger_fired',
        status: 'Simulated',
        renderedBody: `Trigger event "${journey.triggerType || 'Order Placed'}" fired.`,
        executedAt: new Date()
      }];

      const state = await prisma.userJourneyState.create({
        data: {
          id: stateId,
          journeyId: journey.id,
          userId: userId ? String(userId) : '',
          userType,
          name: name || 'Student',
          phone: phone || '',
          email: email || '',
          metadata: metadata || {},
          currentNodeId: firstActiveNode.id,
          scheduledExecutionTime: scheduledTime,
          status: 'Pending',
          history: initialHistory
        }
      });

      await prisma.journey.update({
        where: { id: journey.id },
        data: { totalEnrolled: { increment: 1 } }
      });
      console.log(`[JourneyEngine] Enrolled user ${name} (${phone}) into "${journey.name}" at node ${firstActiveNode.id}`);

      // Attach journey model for immediate in-memory node execution
      state.journey = journey;

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
   * Fire an event trigger (e.g. 'Order Completed', 'Order Cancelled', 'Refund Settled')
   */
  async triggerEvent(triggerType, userDetails) {
    try {
      const activeJourneys = await prisma.journey.findMany({
        where: { triggerType, status: 'Active' }
      });

      let anyEnrolled = false;
      if (activeJourneys.length > 0) {
        for (const journey of activeJourneys) {
          const state = await this.enrollUser(journey.id, userDetails);
          if (state) anyEnrolled = true;
        }
      }

      // 🛡️ FAILSAFE SYSTEM FALLBACK:
      // If no active journey exists or all enrollments failed,
      // deliver a brand-standard fallback alert so students are never left without notice.
      if (!anyEnrolled) {
        await this.sendFailsafeFallback(triggerType, userDetails);
      }
    } catch (err) {
      console.error(`[JourneyEngine] Error firing event "${triggerType}":`, err.message);
    }
  }

  /**
   * Failsafe System Brand Fallback for critical lifecycle events
   */
  async sendFailsafeFallback(triggerType, userDetails) {
    const phone = userDetails?.phone;
    if (!phone) return;

    const meta = userDetails?.metadata || userDetails || {};
    const orderNum = meta.orderNumber || meta.orderId || '';
    const storeName = meta.storeName || 'Campus Food Counter';
    const amountStr = meta.amount ? `₹${Number(meta.amount).toFixed(2)}` : '';
    const targetUpi = meta.customerUpi || meta.customerUpiId || 'UPI on file';
    const trackerUrl = `https://www.universeorder.co.in/order-tracker/${orderNum}`;
    const utrStr = meta.utr ? `\n📌 *Bank Ref / UTR:* \`${meta.utr}\`` : '';

    let fallbackMessage = null;

    if (triggerType === 'Order Cancelled' || triggerType === 'Order Rejected') {
      fallbackMessage =
        `*UNIVERSE: REFUND QUEUED* ⚠️\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `We're sorry, *${storeName}* was unable to accept Order *#${orderNum}*.\n\n` +
        `💰 *Refund Amount:* ${amountStr || '₹0.00'}\n` +
        `⚡ *Status:* Queued for Instant Direct UPI Transfer\n` +
        `💳 *Target UPI:* \`${targetUpi}\`\n\n` +
        `🔗 *Live Refund Tracker:*\n${trackerUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_UniVerse Student Support • 24/7 Campus Assistance_`;
    } else if (triggerType === 'Refund Settled') {
      fallbackMessage =
        `*UNIVERSE: REFUND CREDITED* 🎉\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Your refund has been transferred directly into your bank account via UPI.\n\n` +
        `📋 *Order:* #${orderNum} (${storeName})\n` +
        `💰 *Amount Credited:* ${amountStr || '₹0.00'}\n` +
        `💳 *Transferred to:* \`${targetUpi}\`${utrStr}\n\n` +
        `Please check your UPI app (GPay / PhonePe / Paytm). ❤️\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_UniVerse Campus Dining • Thank you for your patience!_`;
    }

    if (fallbackMessage) {
      console.log(`[JourneyEngine] Failsafe fallback sent for "${triggerType}" to ${phone}`);
      await whatsappMultiDeviceService.sendDirectMessage(phone, fallbackMessage).catch(() => {});
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
      const dueStates = await prisma.userJourneyState.findMany({
        where: {
          status: 'Pending',
          scheduledExecutionTime: { lte: now }
        },
        take: 50,
        include: { journey: true }
      });

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

      const candidateStates = await prisma.userJourneyState.findMany({
        where: {
          status: { in: ['Pending', 'Waiting_Event'] }
        },
        include: { journey: true }
      });

      const activeStates = candidateStates.filter(s => {
        const m = getMetadata(s);
        const sOrderId = String(m.orderId || '');
        const sOrderNum = String(m.orderNumber || '');
        return (
          (orderIdStr && (sOrderId === orderIdStr || sOrderNum === orderIdStr)) ||
          (orderNumStr && (sOrderId === orderNumStr || sOrderNum === orderNumStr))
        );
      });

      let resumedCount = 0;

      for (const state of activeStates) {
        const journey = state.journey;
        if (!journey || journey.status !== 'Active') continue;

        const nodes = parseNodes(journey.nodes);
        const node = nodes.find(n => n.id === state.currentNodeId);
        if (!node) continue;

        // Merge updated metadata
        let updatedMetadata = getMetadata(state);
        if (orderDetails?.metadata) {
          updatedMetadata = { ...updatedMetadata, ...getMetadata(orderDetails.metadata) };
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
          const nextNode = nodes.find(n => n.id === nextNodeId);
          if (nextNode) {
            const updatedState = await prisma.userJourneyState.update({
              where: { id: state.id },
              data: {
                currentNodeId: nextNode.id,
                status: 'Pending',
                scheduledExecutionTime: new Date(),
                metadata: updatedMetadata
              },
              include: { journey: true }
            });
            resumedCount++;
            // Execute immediately without delay
            await this.executeNode(updatedState);
          }
        }
      }
      return resumedCount;
    } catch (err) {
      console.error('[JourneyEngine] Error resuming order journey:', err.message);
      return 0;
    }
  }

  /**
   * Execute single node for a user state
   */
  async executeNode(state) {
    try {
      let journey = state.journey;
      if (!journey) {
        journey = await prisma.journey.findUnique({
          where: { id: String(state.journeyId) }
        });
      }

      if (!journey || journey.status !== 'Active') {
        await prisma.userJourneyState.update({
          where: { id: state.id },
          data: { status: 'Cancelled' }
        });
        return;
      }

      const nodes = parseNodes(journey.nodes);
      const node = nodes.find(n => n.id === state.currentNodeId);
      if (!node) {
        await prisma.userJourneyState.update({
          where: { id: state.id },
          data: { status: 'Completed' }
        });
        await prisma.journey.update({
          where: { id: journey.id },
          data: { totalCompleted: { increment: 1 } }
        });
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
        await prisma.userJourneyState.update({
          where: { id: state.id },
          data: { status: 'Waiting_Event' }
        });
        console.log(`[JourneyEngine] User ${state.phone} paused at [${node.label}], waiting for event: ${node.config?.eventType || 'order_event'}`);
        return;
      } else if (node.type === 'tag') {
        console.log(`[JourneyEngine] Tagged user ${state.phone} with tag "${node.config?.tagName || 'VIP'}"`);
        nextNodeId = node.nextNodeId;
      }

      // Check if journey is finished
      if (!nextNodeId) {
        await prisma.userJourneyState.update({
          where: { id: state.id },
          data: { status: 'Completed' }
        });
        await prisma.journey.update({
          where: { id: journey.id },
          data: { totalCompleted: { increment: 1 } }
        });
        console.log(`[JourneyEngine] User ${state.phone} completed journey "${journey.name}"`);
        return;
      }

      // Advance to next node
      const nextNode = nodes.find(n => n.id === nextNodeId);
      if (!nextNode) {
        await prisma.userJourneyState.update({
          where: { id: state.id },
          data: { status: 'Completed' }
        });
        await prisma.journey.update({
          where: { id: journey.id },
          data: { totalCompleted: { increment: 1 } }
        });
        return;
      }

      const history = Array.isArray(state.history) ? [...state.history] : [];
      let nextStatus = 'Pending';
      let scheduledTime = new Date();

      if (nextNode.type === 'delay') {
        const delayMs = ((nextNode.config?.delayDays || 0) * 86400 + (nextNode.config?.delayHours || 0) * 3600 + (nextNode.config?.delayMinutes || 0) * 60) * 1000;
        scheduledTime = new Date(Date.now() + Math.max(delayMs, 1000));
        nextStatus = 'Pending';
        history.push({
          nodeId: nextNode.id,
          action: 'delay_scheduled',
          status: 'Scheduled',
          renderedBody: `Scheduled wait: ${nextNode.label || 'Timer delay'} (executes at ${scheduledTime.toLocaleTimeString()})`,
          executedAt: new Date()
        });
      } else if (nextNode.type === 'wait_event') {
        nextStatus = 'Waiting_Event';
        history.push({
          nodeId: nextNode.id,
          action: 'waiting_order_event',
          status: 'Listening 24/7',
          renderedBody: `Workflow standing by at [${nextNode.label}]. Awaiting real-time event "${nextNode.config?.eventType || 'Order Event'}" to advance.`,
          executedAt: new Date()
        });
      }

      const updatedState = await prisma.userJourneyState.update({
        where: { id: state.id },
        data: {
          currentNodeId: nextNode.id,
          status: nextStatus,
          scheduledExecutionTime: scheduledTime,
          history
        },
        include: { journey: true }
      });

      // If next node is immediate action or condition, execute immediately
      if (nextNode.type === 'action' || nextNode.type === 'condition' || nextNode.type === 'tag') {
        await this.executeNode(updatedState);
      }

    } catch (err) {
      console.error(`[JourneyEngine] Error executing node ${state.currentNodeId}:`, err.message);
      await prisma.userJourneyState.update({
        where: { id: state.id },
        data: { status: 'Failed' }
      }).catch(() => {});
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

    const activeChannel = channel || 'whatsapp';

    let template = null;
    if (masterTemplateId) {
      template = await prisma.masterTemplate.findUnique({
        where: { id: String(masterTemplateId) }
      }).catch(() => null);
    }

    const meta = getMetadata(state);
    let rawBody = customBody || template?.body || '👋 Hi {{name}}, welcome to UniVerse! Order fresh food easily on campus at https://www.universeorder.co.in 🍔🍕';

    const orderNum = meta.orderNumber || meta.orderId || '';
    const cleanAmount = meta.amount ? (typeof meta.amount === 'number' ? meta.amount.toFixed(2) : meta.amount.toString().replace(/₹/g, '')) : '';
    const trackerUrl = `https://www.universeorder.co.in/order-tracker/${orderNum}`;
    const customerUpi = meta.customerUpi || meta.customerUpiId || 'UPI on file';
    const utrVal = meta.utr || 'Logged in Bank Records';
    const reasonVal = meta.reason || 'Kitchen closed or item out of stock';
    const storeVal = meta.storeName || 'Campus Food Counter';

    let body = rawBody
      .replace(/{{name}}/gi, state.name || 'Student')
      .replace(/{{phone}}/gi, state.phone || '')
      .replace(/{{email}}/gi, state.email || '')
      .replace(/{{orderId}}/gi, orderNum)
      .replace(/{{orderNumber}}/gi, orderNum)
      .replace(/{{storeName}}/gi, storeVal)
      .replace(/{{amount}}/gi, cleanAmount ? `₹${cleanAmount}` : '')
      .replace(/{{customerUpi}}/gi, customerUpi)
      .replace(/{{customerUpiId}}/gi, customerUpi)
      .replace(/{{utr}}/gi, utrVal)
      .replace(/{{reason}}/gi, reasonVal)
      .replace(/{{trackerLink}}/gi, trackerUrl);

    const history = Array.isArray(state.history) ? [...state.history] : [];

    if (activeChannel === 'whatsapp' && state.phone) {
      let slotIndex = 1;
      if (channelAccountId) {
        const channelAccount = await prisma.channelAccount.findUnique({
          where: { id: String(channelAccountId) }
        }).catch(() => null);
        if (channelAccount?.slotIndex) slotIndex = channelAccount.slotIndex;
      }

      let buttons = Array.isArray(template?.buttons) ? template.buttons : [];
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

      let sentSuccessfully = false;
      let deliveryError = null;

      try {
        await whatsappMultiDeviceService.sendMessage(slotIndex, state.phone, payload);
        sentSuccessfully = true;
      } catch (err) {
        console.warn(`[JourneyEngine] Slot ${slotIndex} dispatch failed (${err.message}). Attempting failover across all connected slots...`);
        try {
          const directSent = await whatsappMultiDeviceService.sendDirectMessage(state.phone, body, payload);
          if (directSent) {
            sentSuccessfully = true;
          } else {
            deliveryError = err.message || 'All WhatsApp slots offline';
          }
        } catch (fbErr) {
          deliveryError = fbErr.message;
        }
      }

      history.push({
        nodeId: node.id,
        action: 'whatsapp_sent',
        channelAccountId,
        status: sentSuccessfully ? 'Delivered' : 'Offline_Queued',
        recipient: state.phone,
        renderedBody: body,
        slotIndex,
        error: sentSuccessfully ? null : deliveryError,
        executedAt: new Date()
      });

      await prisma.userJourneyState.update({
        where: { id: state.id },
        data: { history }
      }).catch(() => {});

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

      history.push({
        nodeId: node.id,
        action: 'email_sent',
        channelAccountId,
        status: 'Delivered',
        recipient: state.email,
        renderedBody: body,
        executedAt: new Date()
      });

      await prisma.userJourneyState.update({
        where: { id: state.id },
        data: { history }
      }).catch(() => {});
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
      const count = await prisma.order.count({
        where: {
          customerPhone: state.phone,
          createdAt: { gte: oneDayAgo },
          status: { in: ['Completed', 'Confirmed', 'Cooking', 'Ready'] }
        }
      });
      return count > 0;
    }

    if (conditionType === 'has_completed_orders' && state.phone) {
      const count = await prisma.order.count({
        where: {
          customerPhone: state.phone,
          status: 'Completed'
        }
      });
      return count > 0;
    }

    return true;
  }
}

const journeyEngineService = new JourneyEngineService();
module.exports = journeyEngineService;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');
const emailMultiAccountService = require('../services/emailMultiAccountService');
const journeyEngineService = require('../services/journeyEngineService');

router.use(superAdminAuth);

/**
 * 1. GET ALL BROADCAST CAMPAIGNS
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.broadcastCampaign.findMany({
      include: {
        channelAccount: {
          select: { id: true, nickname: true, phoneNumber: true, emailConfig: true, slotIndex: true }
        },
        template: {
          select: { id: true, name: true, channel: true, category: true, body: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = campaigns.map(c => ({
      ...c,
      _id: c.id,
      channelAccountId: c.channelAccount ? { ...c.channelAccount, _id: c.channelAccount.id } : null,
      masterTemplateId: c.template ? { ...c.template, _id: c.template.id } : null
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. DISPATCH TARGETED BROADCAST CAMPAIGN
 */
router.post('/dispatch', async (req, res) => {
  try {
    const { 
      name, 
      channel, 
      channelAccountId, 
      masterTemplateId, 
      targetAudience, 
      customNumbers, 
      customEmails 
    } = req.body;

    if (!name || !channel || !channelAccountId || !masterTemplateId) {
      return res.status(400).json({ message: 'Campaign name, channel, sender account, and template are required.' });
    }

    const template = await prisma.masterTemplate.findUnique({
      where: { id: String(masterTemplateId) }
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const channelAccount = await prisma.channelAccount.findUnique({
      where: { id: String(channelAccountId) }
    });
    if (!channelAccount) return res.status(404).json({ message: 'Channel sender account not found' });

    // Build recipient list based on audience
    let recipients = [];

    if (customNumbers && customNumbers.length > 0) {
      recipients = customNumbers.map(n => ({
        phone: n.trim(),
        name: req.body.recipientName || '',
        email: ''
      }));
    } else if (targetAudience === 'All Vendors') {
      const vendors = await prisma.admin.findMany({ where: { role: 'vendor' } });
      recipients = vendors.map(v => ({
        phone: v.telegramChatId || '', // fallback
        name: v.name || '',
        email: v.email || ''
      })).filter(r => r.phone || r.email);
    } else if (targetAudience === 'All Students' || targetAudience === 'Campus Zone Users') {
      const orders = await prisma.order.findMany({
        where: { customerPhone: { not: '' } },
        orderBy: { createdAt: 'desc' }
      });
      const phoneMap = new Map();
      orders.forEach(o => {
        if (o.customerPhone && !phoneMap.has(o.customerPhone)) {
          phoneMap.set(o.customerPhone, {
            phone: o.customerPhone,
            name: o.customerName || '',
            email: o.customerEmail || ''
          });
        }
      });
      recipients = Array.from(phoneMap.values());
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No valid recipients found for this target audience.' });
    }

    const campaignId = crypto.randomUUID();
    const statsObj = {
      totalRecipients: recipients.length,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0
    };

    const campaign = await prisma.broadcastCampaign.create({
      data: {
        id: campaignId,
        name,
        channel,
        channelAccountId: channelAccount.id,
        masterTemplateId: template.id,
        targetAudience: targetAudience || 'All Students',
        customFilters: { customNumbers, customEmails },
        stats: statsObj,
        totalRecipients: recipients.length,
        status: 'In-Progress',
        startedAt: new Date()
      }
    });

    // Async execution of broadcast queue
    const io = req.app.get('io');
    executeBroadcastAsync(campaign.id, channelAccount, template, recipients, io);

    res.json({
      success: true,
      message: `Broadcast "${name}" initiated for ${recipients.length} recipients.`,
      campaignId: campaign.id,
      _id: campaign.id,
      totalRecipients: recipients.length
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper for paced background execution
async function executeBroadcastAsync(campaignId, channelAccount, template, recipients, io) {
  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let lastErrorMsg = null;
  const logs = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      // Dynamic tag substitution
      let body = template.body
        .replace(/{{name}}/gi, recipient.name || 'Campus Member')
        .replace(/{{campus}}/gi, recipient.campus || 'UniVerse Campus')
        .replace(/{{discount_code}}/gi, recipient.discountCode || '')
        .replace(/{{phone}}/gi, recipient.phone || '')
        .replace(/{{email}}/gi, recipient.email || '');

      if (channelAccount.type === 'whatsapp' && recipient.phone) {
        let slotIndex = channelAccount.slotIndex || 1;
        // Verify slot connection, or auto-fallback to any connected slot
        if (whatsappMultiDeviceService.status.get(slotIndex) !== 'connected') {
          for (let s = 1; s <= 5; s++) {
            if (whatsappMultiDeviceService.status.get(s) === 'connected') {
              slotIndex = s;
              break;
            }
          }
        }

        const payload = {
          headerType: template.headerType,
          headerMediaUrl: template.headerMediaUrl,
          body,
          footer: template.footer,
          buttons: Array.isArray(template.buttons) ? template.buttons : []
        };

        try {
          await whatsappMultiDeviceService.sendMessage(slotIndex, recipient.phone, payload);
        } catch (sendErr) {
          // If failed with image/media, retry as pure text
          if (payload.headerMediaUrl) {
            console.warn(`[Broadcast] Image dispatch failed (${sendErr.message}), falling back to text for ${recipient.phone}`);
            await whatsappMultiDeviceService.sendMessage(slotIndex, recipient.phone, {
              ...payload,
              headerType: 'NONE',
              headerMediaUrl: null,
              body: `${body}\n\n📷 Image: ${payload.headerMediaUrl}`
            });
          } else {
            throw sendErr;
          }
        }

        deliveredCount++;
        logs.push({ recipient: recipient.phone, status: 'Delivered', error: null });
      } else if (channelAccount.type === 'email' && recipient.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 1.5rem; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            ${template.emailHeroImageUrl ? `<img src="${template.emailHeroImageUrl}" style="width: 100%; border-radius: 12px; margin-bottom: 1rem;" />` : ''}
            <h2 style="color: #ef4123;">${template.subject || template.name}</h2>
            <div style="line-height: 1.6; font-size: 1rem;">${body.replace(/\n/g, '<br/>')}</div>
            ${template.emailCtaText ? `<div style="margin: 2rem 0; text-align: center;"><a href="${template.emailCtaUrl}" style="background: #ef4123; color: white; padding: 0.8rem 2rem; border-radius: 100px; text-decoration: none; font-weight: bold;">${template.emailCtaText}</a></div>` : ''}
          </div>
        `;
        await emailMultiAccountService.sendEmail(channelAccount.id, {
          to: recipient.email,
          subject: template.subject || template.name,
          html,
          text: body
        });
        deliveredCount++;
        logs.push({ recipient: recipient.email, status: 'Delivered', error: null });
      }
      sentCount++;
    } catch (err) {
      console.error(`[Broadcast] Error for recipient ${recipient.phone || recipient.email}:`, err.message);
      lastErrorMsg = err.message;
      failedCount++;
      logs.push({ recipient: recipient.phone || recipient.email, status: 'Failed', error: err.message });
    }

    // Stream live progress via Socket.io
    if (io) {
      const progressData = {
        campaignId: campaignId.toString(),
        sentCount,
        deliveredCount,
        failedCount,
        total: recipients.length,
        progressPercent: Math.round(((i + 1) / recipients.length) * 100),
        lastError: lastErrorMsg
      };
      io.to('superadmin_room').emit('superadmin:broadcast_progress', progressData);
      io.emit('superadmin:broadcast_progress', progressData);
    }
  }

  // Finalize campaign stats
  const finalStatus = failedCount === recipients.length ? 'Failed' : (failedCount > 0 ? 'Partial' : 'Completed');
  await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      lastError: lastErrorMsg,
      logs: logs.slice(0, 100),
      sentCount,
      deliveredCount,
      failedCount,
      stats: {
        totalRecipients: recipients.length,
        sentCount,
        deliveredCount,
        failedCount
      },
      completedAt: new Date()
    }
  }).catch(() => {});

  if (io) {
    const finalData = {
      campaignId: campaignId.toString(),
      sentCount,
      deliveredCount,
      failedCount,
      total: recipients.length,
      progressPercent: 100,
      status: finalStatus,
      lastError: lastErrorMsg
    };
    io.to('superadmin_room').emit('superadmin:broadcast_progress', finalData);
    io.emit('superadmin:broadcast_progress', finalData);
  }
}

/**
 * 2.1 GET SINGLE CAMPAIGN STATUS / PROGRESS
 */
router.get('/campaigns/:id/status', async (req, res) => {
  try {
    const campaign = await prisma.broadcastCampaign.findUnique({
      where: { id: req.params.id }
    });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const stats = campaign.stats && typeof campaign.stats === 'object' ? campaign.stats : {};
    const total = stats.totalRecipients || campaign.totalRecipients || 1;
    const sent = (stats.sentCount || campaign.sentCount || 0) + (stats.failedCount || campaign.failedCount || 0);
    const progressPercent = Math.min(100, Math.round((sent / total) * 100));

    res.json({
      campaignId: campaign.id,
      _id: campaign.id,
      status: campaign.status,
      stats: {
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        failedCount: campaign.failedCount,
        ...stats
      },
      progressPercent: campaign.status === 'Completed' ? 100 : progressPercent
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. JOURNEY BUILDER: GET ALL JOURNEYS
 */
router.get('/journeys', async (req, res) => {
  try {
    const journeys = await prisma.journey.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(journeys.map(j => ({ ...j, _id: j.id })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. JOURNEY BUILDER: CREATE JOURNEY
 */
router.post('/journeys', async (req, res) => {
  try {
    const { name, description, triggerType, nodes, status } = req.body;
    if (!name || !triggerType) {
      return res.status(400).json({ message: 'Name and triggerType are required.' });
    }

    const journey = await prisma.journey.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description: description || '',
        triggerType,
        nodes: nodes || [],
        status: status || 'Draft'
      }
    });

    res.status(201).json({ ...journey, _id: journey.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. JOURNEY BUILDER: UPDATE JOURNEY
 */
router.put('/journeys/:id', async (req, res) => {
  try {
    const { name, description, triggerType, nodes, status } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.journey.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ ...updated, _id: updated.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. JOURNEY BUILDER: DELETE JOURNEY
 */
router.delete('/journeys/:id', async (req, res) => {
  try {
    await prisma.journey.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Journey deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 7. JOURNEY BUILDER: TEST ENROLL CONTACT & RETURN LIVE EXECUTION TRACE
 */
router.post('/journeys/:id/enroll-test', async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required for test enrollment.' });
    }

    const journey = await prisma.journey.findUnique({
      where: { id: req.params.id }
    });
    if (!journey) {
      return res.status(404).json({ success: false, message: 'Journey not found in AWS RDS.' });
    }

    const enrolledState = await journeyEngineService.enrollUser(req.params.id, {
      userId: 'test_user_' + Date.now(),
      userType: 'Student',
      name: name || 'Parth Sharma',
      phone: phone || '',
      email: email || '',
      metadata: {
        orderId: 'TEST-1001',
        orderNumber: '1001',
        storeName: 'Campus Food Court',
        amount: 150
      },
      isTest: true
    });

    if (!enrolledState) {
      return res.status(400).json({ success: false, message: 'Failed to enroll in journey. Ensure journey has valid connected nodes starting from Trigger.' });
    }

    // Fetch refreshed state with execution history
    const finalState = await prisma.userJourneyState.findUnique({
      where: { id: enrolledState.id }
    });

    // Map trace with journey node labels for rich visual timeline
    const nodeMap = {};
    (journey.nodes || []).forEach(n => { nodeMap[n.id] = n; });

    const executionTrace = (finalState?.history || []).map(h => {
      const node = nodeMap[h.nodeId];
      return {
        nodeId: h.nodeId,
        nodeLabel: node?.label || h.action,
        nodeType: node?.type || 'action',
        action: h.action,
        status: h.status || 'Executed',
        recipient: h.recipient || phone,
        renderedBody: h.renderedBody || null,
        slotIndex: h.slotIndex || 1,
        time: h.executedAt || new Date()
      };
    });

    res.json({
      success: true,
      message: `Trigger Simulated: Executed live workflow for ${name || phone}!`,
      state: { ...finalState, _id: finalState?.id },
      executionTrace
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

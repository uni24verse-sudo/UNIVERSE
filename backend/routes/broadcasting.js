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
      whatsappAccountId,
      emailAccountId,
      whatsappTemplateId,
      emailTemplateId,
      targetAudience, 
      customNumbers, 
      customEmails,
      uploadedAudience,
      audienceFilters,
      pacing
    } = req.body;

    if (!name || !channel) {
      return res.status(400).json({ message: 'Campaign name and channel are required.' });
    }

    const isBoth = channel === 'both';
    let waAccount = null;
    let waTemplate = null;
    let emAccount = null;
    let emTemplate = null;

    if (channel === 'whatsapp' || isBoth) {
      const waId = whatsappAccountId || channelAccountId;
      const waTplId = whatsappTemplateId || masterTemplateId;
      if (!waId || !waTplId) {
        return res.status(400).json({ message: 'WhatsApp sender account and Master Template are required.' });
      }
      waAccount = await prisma.channelAccount.findUnique({ where: { id: String(waId) } });
      waTemplate = await prisma.masterTemplate.findUnique({ where: { id: String(waTplId) } });
      if (!waAccount) return res.status(404).json({ message: 'WhatsApp sender account not found' });
      if (!waTemplate) return res.status(404).json({ message: 'WhatsApp template not found' });
    }

    if (channel === 'email' || isBoth) {
      const emId = emailAccountId || channelAccountId;
      const emTplId = emailTemplateId || masterTemplateId;
      if (!emId || !emTplId) {
        return res.status(400).json({ message: 'Email sender account and Master Template are required.' });
      }
      emAccount = await prisma.channelAccount.findUnique({ where: { id: String(emId) } });
      emTemplate = await prisma.masterTemplate.findUnique({ where: { id: String(emTplId) } });
      if (!emAccount) return res.status(404).json({ message: 'Email sender account not found' });
      if (!emTemplate) return res.status(404).json({ message: 'Email template not found' });
    }

    // Build recipient list based on audience
    let recipients = [];
    const phoneMap = new Map();

    // Helper to clean phone
    const cleanPhone = (p) => {
      if (!p) return '';
      let cl = String(p).trim().replace(/[^\d+]/g, '');
      if (cl.startsWith('+91')) cl = cl.slice(3);
      else if (cl.startsWith('91') && cl.length === 12) cl = cl.slice(2);
      else if (cl.startsWith('0') && cl.length === 11) cl = cl.slice(1);
      return cl.replace(/[^\d]/g, '');
    };

    // A. Direct uploaded audience from wizard
    if (Array.isArray(uploadedAudience) && uploadedAudience.length > 0) {
      for (const row of uploadedAudience) {
        const p = cleanPhone(row.phone || row.mobile);
        if (p && p.length >= 7) {
          if (!phoneMap.has(p)) {
            phoneMap.set(p, {
              phone: p,
              name: String(row.name || 'Recipient').trim(),
              email: String(row.email || '').trim().toLowerCase(),
              campus: String(row.campus || 'UniVerse Campus').trim()
            });
          }
        }
      }

      // Automatically persist uploaded contacts into Master Data table with phone deduplication
      setImmediate(async () => {
        try {
          for (const item of phoneMap.values()) {
            const safeName = item.name.replace(/'/g, "''");
            const safeEmail = item.email.replace(/'/g, "''");
            const safeCampus = item.campus.replace(/'/g, "''");
            const safeCampaignName = String(name).replace(/'/g, "''");
            const id = crypto.randomUUID();

            await prisma.$executeRawUnsafe(`
              INSERT INTO mastercontacts (id, phone, name, email, campus, source, "createdAt", "updatedAt")
              VALUES ('${id}', '${item.phone}', '${safeName}', '${safeEmail}', '${safeCampus}', 'Broadcast Import: ${safeCampaignName}', NOW(), NOW())
              ON CONFLICT (phone) DO UPDATE SET
                name = CASE WHEN mastercontacts.name IN ('Recipient', '') THEN EXCLUDED.name ELSE mastercontacts.name END,
                email = CASE WHEN mastercontacts.email = '' THEN EXCLUDED.email ELSE mastercontacts.email END,
                "updatedAt" = NOW();
            `).catch(() => {});
          }
        } catch (e) {
          console.warn('[Broadcast] Auto-sync to Master Data note:', e.message);
        }
      });
    } else if (customNumbers && customNumbers.length > 0) {
      for (const n of customNumbers) {
        const p = cleanPhone(n);
        if (p && p.length >= 7 && !phoneMap.has(p)) {
          phoneMap.set(p, {
            phone: p,
            name: req.body.recipientName || 'Recipient',
            email: ''
          });
        }
      }
    } else if (targetAudience === 'All Vendors') {
      const vendors = await prisma.admin.findMany({ where: { role: 'vendor' } });
      vendors.forEach(v => {
        const p = cleanPhone(v.telegramChatId || '');
        if (p && !phoneMap.has(p)) {
          phoneMap.set(p, { phone: p, name: v.name || 'Vendor Partner', email: v.email || '' });
        }
      });
    } else {
      // Master Data Contacts Audience Selection
      const conditions = [];
      const filters = audienceFilters || {};

      // Filter by Source (Customer 360, Uploaded Data, Manual, All)
      if (filters.source && filters.source !== 'all') {
        conditions.push(`source ILIKE '%${String(filters.source).replace(/'/g, "''")}%'`);
      }

      // Filter by Reachability / Contact & Mail filters
      if (filters.reachability === 'whatsapp') {
        conditions.push(`phone IS NOT NULL AND phone != ''`);
      } else if (filters.reachability === 'email') {
        conditions.push(`email IS NOT NULL AND email != '' AND email LIKE '%@%'`);
      } else if (filters.reachability === 'both') {
        conditions.push(`phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != '' AND email LIKE '%@%'`);
      }

      // Filter by Campus
      if (filters.campus && filters.campus !== 'All') {
        conditions.push(`campus ILIKE '%${String(filters.campus).replace(/'/g, "''")}%'`);
      }

      // Search keyword filter (Name, Contact phone, Email)
      if (filters.search && String(filters.search).trim()) {
        const q = String(filters.search).trim().replace(/'/g, "''");
        conditions.push(`(name ILIKE '%${q}%' OR phone ILIKE '%${q}%' OR email ILIKE '%${q}%' OR campus ILIKE '%${q}%')`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      let limitClause = '';
      if (filters.limit && parseInt(filters.limit) > 0) {
        limitClause = `LIMIT ${parseInt(filters.limit)}`;
      }

      let masterRows = [];
      try {
        masterRows = await prisma.$queryRawUnsafe(`
          SELECT * FROM mastercontacts 
          ${whereClause} 
          ORDER BY "updatedAt" DESC 
          ${limitClause}
        `);
      } catch (err) {
        console.warn('[Broadcast] Error querying mastercontacts table:', err.message);
      }

      if (masterRows && masterRows.length > 0) {
        for (const m of masterRows) {
          const p = cleanPhone(m.phone);
          if (p && p.length >= 7 && !phoneMap.has(p)) {
            phoneMap.set(p, {
              phone: p,
              name: m.name || 'UniVerse Student',
              email: m.email || '',
              campus: m.campus || 'Lovely Professional University',
              notes: m.notes || ''
            });
          }
        }
      } else {
        // Fallback to customer model if table is empty
        const customers = await prisma.customer.findMany({
          orderBy: { updatedAt: 'desc' }
        });

        for (const c of customers) {
          const p = cleanPhone(c.phone);
          if (p && p.length >= 7 && !phoneMap.has(p)) {
            phoneMap.set(p, {
              phone: p,
              name: c.currentName || 'UniVerse Student',
              email: c.email || '',
              campus: c.campus || 'Lovely Professional University'
            });
          }
        }
      }
    }

    recipients = Array.from(phoneMap.values());

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
        channelAccountId: waAccount ? waAccount.id : (emAccount ? emAccount.id : null),
        masterTemplateId: waTemplate ? waTemplate.id : (emTemplate ? emTemplate.id : null),
        targetAudience: targetAudience || 'Customer 360 / Master Data',
        customFilters: { 
          customNumbers, 
          customEmails, 
          audienceFilters,
          whatsappAccountId: waAccount?.id,
          emailAccountId: emAccount?.id,
          whatsappTemplateId: waTemplate?.id,
          emailTemplateId: emTemplate?.id
        },
        stats: statsObj,
        totalRecipients: recipients.length,
        status: 'In-Progress',
        startedAt: new Date()
      }
    });

    // Async execution of broadcast queue
    const io = req.app.get('io');
    executeBroadcastAsync(campaign.id, { channel, waAccount, waTemplate, emAccount, emTemplate }, recipients, io, pacing);

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
async function executeBroadcastAsync(campaignId, config, recipients, io, pacing) {
  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let lastErrorMsg = null;
  const logs = [];
  const { channel, waAccount, waTemplate, emAccount, emTemplate } = config;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    let recipientDelivered = false;

    try {
      // 1. Send WhatsApp if channel is whatsapp or both
      if ((channel === 'whatsapp' || channel === 'both') && waAccount && waTemplate && recipient.phone) {
        let body = waTemplate.body
          .replace(/\{\{1\}\}/g, recipient.name || 'Campus Member')
          .replace(/\{\{name\}\}/gi, recipient.name || 'Campus Member')
          .replace(/\{\{2\}\}/g, recipient.campus || recipient.notes || 'UniVerse Campus')
          .replace(/\{\{detail\}\}/gi, recipient.campus || recipient.notes || 'UniVerse Campus')
          .replace(/\{\{campus\}\}/gi, recipient.campus || 'UniVerse Campus')
          .replace(/\{\{3\}\}/g, recipient.link || recipient.discountCode || 'https://www.universeorder.co.in')
          .replace(/\{\{link\}\}/gi, recipient.link || 'https://www.universeorder.co.in')
          .replace(/\{\{code\}\}/gi, recipient.discountCode || 'UNIVERSE')
          .replace(/\{\{discount_code\}\}/gi, recipient.discountCode || 'UNIVERSE')
          .replace(/\{\{phone\}\}/gi, recipient.phone || '')
          .replace(/\{\{email\}\}/gi, recipient.email || '');

        let slotIndex = waAccount.slotIndex || 1;
        if (whatsappMultiDeviceService.status.get(slotIndex) !== 'connected') {
          for (let s = 1; s <= 5; s++) {
            if (whatsappMultiDeviceService.status.get(s) === 'connected') {
              slotIndex = s;
              break;
            }
          }
        }

        const payload = {
          headerType: waTemplate.headerType,
          headerMediaUrl: waTemplate.headerMediaUrl,
          body,
          footer: waTemplate.footer,
          buttons: Array.isArray(waTemplate.buttons) ? waTemplate.buttons : []
        };

        try {
          await whatsappMultiDeviceService.sendMessage(slotIndex, recipient.phone, payload);
          recipientDelivered = true;
        } catch (sendErr) {
          if (payload.headerMediaUrl) {
            await whatsappMultiDeviceService.sendMessage(slotIndex, recipient.phone, {
              ...payload,
              headerType: 'NONE',
              headerMediaUrl: null,
              body: `${body}\n\n📷 Image: ${payload.headerMediaUrl}`
            });
            recipientDelivered = true;
          } else {
            throw sendErr;
          }
        }
      }

      // 2. Send Email if channel is email or both
      if ((channel === 'email' || channel === 'both') && emAccount && emTemplate && recipient.email) {
        let emailBody = emTemplate.body
          .replace(/\{\{1\}\}/g, recipient.name || 'Campus Member')
          .replace(/\{\{name\}\}/gi, recipient.name || 'Campus Member')
          .replace(/\{\{2\}\}/g, recipient.campus || recipient.notes || 'UniVerse Campus')
          .replace(/\{\{detail\}\}/gi, recipient.campus || recipient.notes || 'UniVerse Campus')
          .replace(/\{\{campus\}\}/gi, recipient.campus || 'UniVerse Campus')
          .replace(/\{\{3\}\}/g, recipient.link || recipient.discountCode || 'https://www.universeorder.co.in')
          .replace(/\{\{link\}\}/gi, recipient.link || 'https://www.universeorder.co.in')
          .replace(/\{\{code\}\}/gi, recipient.discountCode || 'UNIVERSE')
          .replace(/\{\{discount_code\}\}/gi, recipient.discountCode || 'UNIVERSE')
          .replace(/\{\{phone\}\}/gi, recipient.phone || '')
          .replace(/\{\{email\}\}/gi, recipient.email || '');

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 1.5rem; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            ${emTemplate.emailHeroImageUrl ? `<img src="${emTemplate.emailHeroImageUrl}" style="width: 100%; border-radius: 12px; margin-bottom: 1rem;" />` : ''}
            <h2 style="color: #ef4123;">${emTemplate.subject || emTemplate.name}</h2>
            <div style="line-height: 1.6; font-size: 1rem;">${emailBody.replace(/\n/g, '<br/>')}</div>
            ${emTemplate.emailCtaText ? `<div style="margin: 2rem 0; text-align: center;"><a href="${emTemplate.emailCtaUrl}" style="background: #ef4123; color: white; padding: 0.8rem 2rem; border-radius: 100px; text-decoration: none; font-weight: bold;">${emTemplate.emailCtaText}</a></div>` : ''}
          </div>
        `;

        await emailMultiAccountService.sendEmail(emAccount.id, {
          to: recipient.email,
          subject: emTemplate.subject || emTemplate.name,
          html,
          text: emailBody
        });
        recipientDelivered = true;
      }

      if (recipientDelivered) {
        deliveredCount++;
        logs.push({ recipient: recipient.phone || recipient.email, status: 'Delivered', error: null });
      } else {
        throw new Error('No reachable channel contact details');
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
 * 2.2 DELETE SINGLE CAMPAIGN
 */
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.broadcastCampaign.delete({ where: { id } });
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2.3 BULK DELETE CAMPAIGNS
 */
router.post('/campaigns/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No campaign IDs provided' });
    }
    const result = await prisma.broadcastCampaign.deleteMany({
      where: { id: { in: ids } }
    });
    res.json({ success: true, message: `Successfully deleted ${result.count} campaigns.`, count: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper to safely unpack nodes from PostgreSQL Prisma Json column
const parseNodes = (nodes) => {
  if (Array.isArray(nodes)) return nodes;
  if (typeof nodes === 'string') {
    try {
      const parsed = JSON.parse(nodes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

/**
 * 3. JOURNEY BUILDER: GET ALL JOURNEYS
 */
router.get('/journeys', async (req, res) => {
  try {
    const journeys = await prisma.journey.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // Auto-sanitize existing lifecycle flows to ensure 30m delay and clean thank you message
    for (const j of journeys) {
      const nodes = parseNodes(j.nodes);
      let changed = false;

      nodes.forEach(n => {
        if (n.id === 'node_delay_feedback' || (n.type === 'delay' && n.label?.toLowerCase().includes('meal'))) {
          if (!n.config || n.config.delayMinutes !== 30) {
            n.config = { ...n.config, delayDays: 0, delayHours: 0, delayMinutes: 30 };
            changed = true;
          }
        }
        if (n.id === 'node_msg_feedback' || (n.type === 'action' && (n.label?.toLowerCase().includes('feedback') || n.label?.toLowerCase().includes('thank')))) {
          if (n.config?.customBody?.includes('How was your experience today?') || n.config?.btn1Text) {
            n.label = '5. WhatsApp Thank You Message';
            n.config = {
              ...n.config,
              customBody: 'Thank you for ordering with UniVerse! ❤️\n\nWe hope you enjoyed your meal from {{storeName}}.\nSee you again soon! 🌟\n\n_UniVerse • Smart Campus Dining_',
              btn1Text: '',
              btn2Text: ''
            };
            changed = true;
          }
        }
      });

      if (changed) {
        await prisma.journey.update({
          where: { id: j.id },
          data: { nodes }
        }).catch(() => {});
        j.nodes = nodes;
      }
    }

    res.json(journeys.map(j => ({ ...j, _id: j.id, nodes: parseNodes(j.nodes) })));
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

    const cleanNodes = parseNodes(nodes);
    const journey = await prisma.journey.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description: description || '',
        triggerType,
        nodes: cleanNodes,
        status: status || 'Draft'
      }
    });

    res.status(201).json({ ...journey, _id: journey.id, nodes: cleanNodes });
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
    if (nodes !== undefined) updateData.nodes = parseNodes(nodes);
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.journey.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ ...updated, _id: updated.id, nodes: parseNodes(updated.nodes) });
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
    const journeyNodes = parseNodes(journey.nodes);
    journeyNodes.forEach(n => { nodeMap[n.id] = n; });

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

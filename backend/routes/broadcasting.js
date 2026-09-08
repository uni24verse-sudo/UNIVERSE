const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const BroadcastCampaign = require('../models/BroadcastCampaign');
const MasterTemplate = require('../models/MasterTemplate');
const ChannelAccount = require('../models/ChannelAccount');
const Journey = require('../models/Journey');
const UserJourneyState = require('../models/UserJourneyState');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');
const emailMultiAccountService = require('../services/emailMultiAccountService');
const journeyEngineService = require('../services/journeyEngineService');

router.use(superAdminAuth);

/**
 * 1. GET ALL BROADCAST CAMPAIGNS
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await BroadcastCampaign.find()
      .populate('channelAccountId', 'nickname phoneNumber emailConfig slotIndex')
      .populate('masterTemplateId', 'name channel category body')
      .sort({ createdAt: -1 });
    res.json(campaigns);
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

    const template = await MasterTemplate.findById(masterTemplateId);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const channelAccount = await ChannelAccount.findById(channelAccountId);
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
      const vendors = await Admin.find({ role: 'vendor' });
      recipients = vendors.map(v => ({
        phone: v.whatsappNumber || v.phone || '',
        name: v.name || '',
        email: v.email || ''
      })).filter(r => r.phone || r.email);
    } else if (targetAudience === 'All Students' || targetAudience === 'Campus Zone Users') {
      const orders = await Order.find({ customerPhone: { $exists: true, $ne: '' } }).sort({ createdAt: -1 });
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

    // Create campaign record
    const campaign = new BroadcastCampaign({
      name,
      channel,
      channelAccountId,
      masterTemplateId,
      targetAudience,
      customFilters: { customNumbers, customEmails },
      stats: {
        totalRecipients: recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0
      },
      status: 'In-Progress',
      startedAt: new Date()
    });

    await campaign.save();

    // Async execution of broadcast queue
    const io = req.app.get('io');
    executeBroadcastAsync(campaign._id, channelAccount, template, recipients, io);

    res.json({
      success: true,
      message: `Broadcast "${name}" initiated for ${recipients.length} recipients.`,
      campaignId: campaign._id,
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

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      // Dynamic tag substitution
      let body = template.body
        .replace(/{{name}}/gi, recipient.name || '')
        .replace(/{{campus}}/gi, recipient.campus || '')
        .replace(/{{discount_code}}/gi, recipient.discountCode || '')
        .replace(/{{phone}}/gi, recipient.phone || '')
        .replace(/{{email}}/gi, recipient.email || '');

      if (channelAccount.type === 'whatsapp' && recipient.phone) {
        const slotIndex = channelAccount.slotIndex || 1;
        const payload = {
          headerType: template.headerType,
          headerMediaUrl: template.headerMediaUrl,
          body,
          footer: template.footer,
          buttons: template.buttons
        };

        await whatsappMultiDeviceService.sendMessage(slotIndex, recipient.phone, payload);
        deliveredCount++;
      } else if (channelAccount.type === 'email' && recipient.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 1.5rem; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            ${template.emailHeroImageUrl ? `<img src="${template.emailHeroImageUrl}" style="width: 100%; border-radius: 12px; margin-bottom: 1rem;" />` : ''}
            <h2 style="color: #ef4123;">${template.subject || template.name}</h2>
            <div style="line-height: 1.6; font-size: 1rem;">${body.replace(/\n/g, '<br/>')}</div>
            ${template.emailCtaText ? `<div style="margin: 2rem 0; text-align: center;"><a href="${template.emailCtaUrl}" style="background: #ef4123; color: white; padding: 0.8rem 2rem; border-radius: 100px; text-decoration: none; font-weight: bold;">${template.emailCtaText}</a></div>` : ''}
          </div>
        `;
        await emailMultiAccountService.sendEmail(channelAccount._id, {
          to: recipient.email,
          subject: template.subject || template.name,
          html,
          text: body
        });
        deliveredCount++;
      }
      sentCount++;
    } catch (err) {
      console.error(`Broadcast error for recipient ${recipient.phone || recipient.email}:`, err.message);
      failedCount++;
    }

    // Stream live progress via Socket.io
    if (io) {
      const progressData = {
        campaignId: campaignId.toString(),
        sentCount,
        deliveredCount,
        failedCount,
        total: recipients.length,
        progressPercent: Math.round(((i + 1) / recipients.length) * 100)
      };
      io.to('superadmin_room').emit('superadmin:broadcast_progress', progressData);
      io.emit('superadmin:broadcast_progress', progressData);
    }
  }

  // Finalize campaign stats
  const finalStatus = failedCount === recipients.length ? 'Failed' : 'Completed';
  await BroadcastCampaign.findByIdAndUpdate(campaignId, {
    status: finalStatus,
    'stats.sentCount': sentCount,
    'stats.deliveredCount': deliveredCount,
    'stats.failedCount': failedCount,
    completedAt: new Date()
  });

  if (io) {
    const finalData = {
      campaignId: campaignId.toString(),
      sentCount,
      deliveredCount,
      failedCount,
      total: recipients.length,
      progressPercent: 100,
      status: finalStatus
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
    const campaign = await BroadcastCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    const total = campaign.stats?.totalRecipients || 1;
    const sent = (campaign.stats?.sentCount || 0) + (campaign.stats?.failedCount || 0);
    const progressPercent = Math.min(100, Math.round((sent / total) * 100));

    res.json({
      campaignId: campaign._id,
      status: campaign.status,
      stats: campaign.stats,
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
    const journeys = await Journey.find().sort({ updatedAt: -1 });
    res.json(journeys);
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

    const journey = new Journey({
      name,
      description: description || '',
      triggerType,
      nodes: nodes || [],
      status: status || 'Draft'
    });

    await journey.save();
    res.status(201).json(journey);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. JOURNEY BUILDER: UPDATE JOURNEY
 */
router.put('/journeys/:id', async (req, res) => {
  try {
    const updated = await Journey.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. JOURNEY BUILDER: DELETE JOURNEY
 */
router.delete('/journeys/:id', async (req, res) => {
  try {
    await Journey.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Journey deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 7. JOURNEY BUILDER: TEST ENROLL CONTACT
 */
router.post('/journeys/:id/enroll-test', async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required for test enrollment.' });
    }

    const enrolledState = await journeyEngineService.enrollUser(req.params.id, {
      userId: 'test_user_' + Date.now(),
      userType: 'Student',
      name: name || '',
      phone: phone || '',
      email: email || ''
    });

    if (!enrolledState) {
      return res.status(400).json({ success: false, message: 'Failed to enroll in journey. Ensure journey is Active.' });
    }

    res.json({
      success: true,
      message: `Enrolled contact ${name || phone || email} into journey!`,
      state: enrolledState
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

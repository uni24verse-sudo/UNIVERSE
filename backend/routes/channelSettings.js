const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');
const emailMultiAccountService = require('../services/emailMultiAccountService');

// All channel settings routes are strictly SuperAdmin only
router.use(superAdminAuth);

/**
 * 1. GET ALL CHANNEL SESSIONS & ACCOUNTS SUMMARY
 */
router.get('/summary', async (req, res) => {
  try {
    const whatsappSlots = await whatsappMultiDeviceService.getAllSlotsSummary();
    const emailAccounts = await prisma.channelAccount.findMany({
      where: { type: 'email' },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      whatsapp: {
        maxSlots: 5,
        slots: whatsappSlots,
        connectedCount: whatsappSlots.filter(s => s.status === 'connected').length
      },
      email: {
        accounts: emailAccounts.map(a => ({ ...a, _id: a.id }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. REQUEST QR CODE FOR A WHATSAPP SLOT (1 to 5)
 */
router.get('/whatsapp/qr/:slotIndex', async (req, res) => {
  try {
    const slotIndex = parseInt(req.params.slotIndex);
    if (isNaN(slotIndex) || slotIndex < 1 || slotIndex > 5) {
      return res.status(400).json({ success: false, message: 'Invalid slot index. Choose 1 to 5.' });
    }

    const qrResult = await whatsappMultiDeviceService.requestQR(slotIndex);
    res.json({
      success: true,
      slotIndex,
      ...qrResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. UPDATE WHATSAPP SLOT NICKNAME
 */
router.post('/whatsapp/update-nickname/:slotIndex', async (req, res) => {
  try {
    const slotIndex = parseInt(req.params.slotIndex);
    const { nickname } = req.body;

    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ success: false, message: 'Nickname is required.' });
    }

    const account = await prisma.channelAccount.findFirst({
      where: { type: 'whatsapp', slotIndex }
    });

    let updated;
    if (account) {
      updated = await prisma.channelAccount.update({
        where: { id: account.id },
        data: { nickname: nickname.trim() }
      });
    } else {
      updated = await prisma.channelAccount.create({
        data: {
          id: `wa_slot_${slotIndex}`,
          type: 'whatsapp',
          slotIndex,
          nickname: nickname.trim()
        }
      });
    }

    res.json({ success: true, account: { ...updated, _id: updated.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. DISCONNECT / LOG OUT WHATSAPP SLOT
 */
router.post('/whatsapp/disconnect/:slotIndex', async (req, res) => {
  try {
    const slotIndex = parseInt(req.params.slotIndex);
    const result = await whatsappMultiDeviceService.disconnect(slotIndex);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. CREATE / ADD EMAIL SENDER ACCOUNT (GMAIL SMTP)
 */
router.post('/email/create', async (req, res) => {
  try {
    const { nickname, senderLabel, fromEmail, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    if (!fromEmail || !smtpPass) {
      return res.status(400).json({ success: false, message: 'From Email and App Password are required.' });
    }

    const emailConfig = {
      senderLabel: senderLabel || 'UniVerse Campus',
      fromEmail: fromEmail.trim(),
      smtpHost: smtpHost || 'smtp.gmail.com',
      smtpPort: smtpPort || 587,
      smtpUser: smtpUser || fromEmail.trim(),
      smtpPass: smtpPass.trim(),
      isVerified: false
    };

    // Test verify credentials
    const verifyResult = await emailMultiAccountService.verifySmtp(emailConfig);
    if (!verifyResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: `SMTP Authentication failed: ${verifyResult.error}. Please check your Gmail App Password.` 
      });
    }

    emailConfig.isVerified = true;

    const newAccount = await prisma.channelAccount.create({
      data: {
        id: crypto.randomUUID(),
        type: 'email',
        nickname: nickname || senderLabel || fromEmail,
        emailConfig,
        status: 'connected',
        lastActive: new Date()
      }
    });

    res.json({ success: true, account: { ...newAccount, _id: newAccount.id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 6. SEND INSTANT TEST EMAIL FROM AN ACCOUNT
 */
router.post('/email/test/:accountId', async (req, res) => {
  try {
    const { targetEmail } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Target email is required.' });
    }

    const result = await emailMultiAccountService.sendTestEmail(req.params.accountId, targetEmail);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 7. DELETE EMAIL SENDER ACCOUNT
 */
router.delete('/email/:accountId', async (req, res) => {
  try {
    await prisma.channelAccount.delete({
      where: { id: req.params.accountId }
    });
    res.json({ success: true, message: 'Email account removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

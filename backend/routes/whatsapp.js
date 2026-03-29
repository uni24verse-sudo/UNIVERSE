const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const telegramService = require('../services/telegramService');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// Test Telegram alert
router.post('/test-telegram', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin.telegramChatId) {
      return res.status(400).json({ message: 'No Telegram Chat ID saved. Please save it first.' });
    }
    const result = await telegramService.sendMessage(admin.telegramChatId, '✅ <b>UniVerse Test Alert!</b>\nYour Telegram notifications are working perfectly! 🎉');
    if (result) {
      res.json({ message: 'Test message sent! Check your Telegram.' });
    } else {
      res.status(500).json({ message: 'Failed to send. Check if TELEGRAM_BOT_TOKEN is set on Render and that you have started the bot.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get current WhatsApp status and QR Code
router.get('/status', auth, (req, res) => {
  const result = whatsappService.getStatus();
  res.json(result);
});

// Force start/re-initialize
router.post('/re-initialize', auth, async (req, res) => {
  try {
    await whatsappService.start();
    res.json({ message: 'WhatsApp client initialization started' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start WhatsApp client', error: err.message });
  }
});

module.exports = router;

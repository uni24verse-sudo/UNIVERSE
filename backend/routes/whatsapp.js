const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');
const axios = require('axios');

// Test & Diagnose Telegram
router.post('/test-telegram', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = admin.telegramChatId;

    const diagnostics = {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'NOT SET',
      hasChatId: !!chatId,
      chatId: chatId || 'NOT SET',
    };

    if (!token) return res.status(500).json({ message: 'TELEGRAM_BOT_TOKEN is not set on Render!', diagnostics });
    if (!chatId) return res.status(400).json({ message: 'No Telegram Chat ID saved.', diagnostics });

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const telegramRes = await axios.post(url, {
        chat_id: chatId,
        text: '✅ <b>UniVerse Test Alert!</b>\nYour Telegram notifications are working! 🎉',
        parse_mode: 'HTML'
      });
      res.json({ message: 'Test message sent! Check your Telegram.', telegramResponse: telegramRes.data, diagnostics });
    } catch (telegramErr) {
      res.status(500).json({
        message: 'Telegram API rejected the request.',
        telegramError: telegramErr.response?.data || telegramErr.message,
        diagnostics
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;

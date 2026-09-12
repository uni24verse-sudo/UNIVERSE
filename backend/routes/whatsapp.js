const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const auth = require('../middleware/auth');
const axios = require('axios');

// Test & Diagnose Telegram
router.post('/test-telegram', auth, async (req, res) => {
  try {
    const { storeId } = req.body;
    const adminId = req.admin.id || req.admin._id;
    const admin = await prisma.admin.findUnique({ where: { id: String(adminId) } });

    let token = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = admin?.telegramChatId;
    let storeName = 'Admin Level';
  
    if (storeId) {
      const store = await prisma.store.findFirst({
        where: {
          id: String(storeId),
          ...(req.admin.role !== 'superadmin' && { adminId: String(adminId) })
        }
      });

      if (store) {
        if (store.telegramChatId) {
          chatId = store.telegramChatId;
          storeName = store.name;
        }
        if (store.telegramBotToken) {
          token = store.telegramBotToken;
        }
      }
    }
 
    const diagnostics = {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'NOT SET',
      hasChatId: !!chatId,
      chatId: chatId || 'NOT SET',
      storeTested: storeName
    };
 
    if (!token) return res.status(500).json({ message: 'TELEGRAM_BOT_TOKEN is not set!', diagnostics });
    if (!chatId) return res.status(400).json({ message: 'No Telegram Chat ID found for this selection.', diagnostics });
 
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const telegramRes = await axios.post(url, {
        chat_id: chatId,
        text: `✅ <b>UniVerse Test Alert!</b>\nNotifications for <b>${storeName}</b> are working! 🎉`,
        parse_mode: 'HTML'
      });
      res.json({ message: `Test message sent for ${storeName}! Check your Telegram.`, telegramResponse: telegramRes.data, diagnostics });
    } catch (telegramErr) {
      const errorData = telegramErr.response?.data || {};
      let customMessage = 'Telegram API rejected the request.';
      
      if (errorData.description?.includes('chat not found')) {
        customMessage = 'Chat not found. Please ensure the vendor has clicked "START" on your Telegram bot first!';
      }

      res.status(500).json({
        message: customMessage,
        telegramError: errorData,
        diagnostics
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const auth = require('../middleware/auth');

// Get current WhatsApp status and QR Code
router.get('/status', auth, (req, res) => {
  const result = whatsappService.getStatus();
  res.json(result);
});

// Force re-initialize if needed
router.post('/re-initialize', auth, (req, res) => {
  whatsappService.initialize();
  res.json({ message: 'WhatsApp client re-initializing' });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const auth = require('../middleware/auth');

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

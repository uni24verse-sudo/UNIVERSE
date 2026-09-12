const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../config/prisma');

// Save FCM token for a vendor / store
router.post('/save-fcm-token', async (req, res) => {
  try {
    const { token, userId, userType } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and userId are required' 
      });
    }

    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { adminId: String(userId) },
          { id: String(userId) }
        ]
      }
    });

    const storeId = store ? store.id : '';

    await prisma.deviceRegistry.upsert({
      where: { token: String(token) },
      update: {
        userId: String(userId),
        storeId,
        pushToken: String(token),
        active: true,
        lastSeen: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        userId: String(userId),
        storeId,
        token: String(token),
        pushToken: String(token),
        active: true,
        lastSeen: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'FCM token saved successfully' 
    });

  } catch (error) {
    console.error('[FCM] Error saving FCM token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Remove FCM token (when user logs out or token becomes invalid)
router.post('/remove-fcm-token', async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }

    await prisma.deviceRegistry.updateMany({
      where: { token: String(token) },
      data: { active: false }
    });

    res.json({ 
      success: true, 
      message: 'FCM token removed successfully' 
    });

  } catch (error) {
    console.error('[FCM] Error removing FCM token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get all FCM tokens for a store (admin use)
router.get('/store-tokens/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const devices = await prisma.deviceRegistry.findMany({
      where: { storeId: String(storeId), active: true }
    });

    res.json({ 
      success: true, 
      tokens: devices.map(d => d.pushToken || d.token).filter(Boolean)
    });

  } catch (error) {
    console.error('[FCM] Error getting FCM tokens:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

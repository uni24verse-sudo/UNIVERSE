const express = require('express');
const router = express.Router();
const Store = require('../models/Store');

// Save FCM token for a vendor
router.post('/save-fcm-token', async (req, res) => {
  try {
    const { token, userId, userType } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and userId are required' 
      });
    }

    // For now, we assume userType is 'vendor' and userId is the store owner's ID
    // Find the store by owner ID and update FCM tokens
    const store = await Store.findOne({ owner: userId });

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!store.fcmTokens) {
      store.fcmTokens = [];
    }

    // Check if token already exists
    const tokenIndex = store.fcmTokens.indexOf(token);
    
    if (tokenIndex === -1) {
      // Add new token
      store.fcmTokens.push(token);
      console.log(`Added new FCM token for store ${store._id}`);
    } else {
      console.log(`FCM token already exists for store ${store._id}`);
    }

    // Limit the number of tokens per store to prevent bloat
    if (store.fcmTokens.length > 5) {
      store.fcmTokens = store.fcmTokens.slice(-5); // Keep only the 5 most recent tokens
    }

    await store.save();

    res.json({ 
      success: true, 
      message: 'FCM token saved successfully' 
    });

  } catch (error) {
    console.error('Error saving FCM token:', error);
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

    if (!token || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and userId are required' 
      });
    }

    const store = await Store.findOne({ owner: userId });

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }

    if (store.fcmTokens) {
      store.fcmTokens = store.fcmTokens.filter(t => t !== token);
      await store.save();
      console.log(`Removed FCM token for store ${store._id}`);
    }

    res.json({ 
      success: true, 
      message: 'FCM token removed successfully' 
    });

  } catch (error) {
    console.error('Error removing FCM token:', error);
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
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }

    res.json({ 
      success: true, 
      tokens: store.fcmTokens || [] 
    });

  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

module.exports = router;

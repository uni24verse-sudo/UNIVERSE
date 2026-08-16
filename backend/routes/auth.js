const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, telegramChatId } = req.body;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: 'Email already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({ name, email, password: hashedPassword, telegramChatId });
    await newAdmin.save();

    res.status(201).json({ message: 'Vendor registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check email
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid email or password' });

    // Check if banned
    if (admin.isBanned) {
      return res.status(403).json({ message: 'Your account has been suspended by the Super Admin.' });
    }

    // Check if staff (block from web dashboard)
    if (admin.role === 'staff') {
      return res.status(403).json({ message: 'Access Denied. Please log in using the Vendor Mobile App.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    // Create and assign token
    const token = jwt.sign({ _id: admin._id, name: admin.name }, process.env.JWT_SECRET, { expiresIn: '10h' });
    res.header('Authorization', token).json({ 
      token, 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email, 
        telegramChatId: admin.telegramChatId,
        role: admin.role,
        seenFeatures: admin.seenFeatures || []
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mobile Login
router.post('/mobile-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check email
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid email or password' });

    // Check if banned or inactive
    if (admin.isBanned || admin.status === 'INACTIVE') {
      return res.status(403).json({ message: 'Your account is inactive or suspended.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Retrieve actual storeId dynamically if not set
    let actualStoreId = admin.storeId;
    if (!actualStoreId && admin.role === 'vendor') {
      const Store = require('../models/Store');
      const vendorStore = await Store.findOne({ admin: admin._id });
      if (vendorStore) {
        actualStoreId = vendorStore._id;
      }
    }

    // Create and assign token
    // For mobile, include role, storeId, and vendorId in token payload
    const tokenPayload = { 
      _id: admin._id, 
      name: admin.name,
      role: admin.role,
      storeId: actualStoreId,
      vendorId: admin.vendorId,
      permissions: admin.permissions || []
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '30d' }); // Longer expiry for mobile apps
    
    res.header('Authorization', token).json({ 
      token, 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email,
        role: admin.role,
        storeId: actualStoreId,
        vendorId: admin.vendorId,
        permissions: admin.permissions || []
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, telegramChatId } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: 'Vendor not found' });

    if (name) admin.name = name;
    if (telegramChatId !== undefined) admin.telegramChatId = telegramChatId;
    
    await admin.save();
    
    res.json({ 
      message: 'Profile updated successfully', 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email, 
        telegramChatId: admin.telegramChatId
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



/*
// Test OneSignal Notification
router.post('/test-fcm', auth, async (req, res) => {
  // ... code ...
});
*/

// Mark Feature as Seen
router.post('/mark-feature-seen', auth, async (req, res) => {
  try {
    const { featureKey } = req.body;
    if (!featureKey) return res.status(400).json({ message: 'Feature key is required' });

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { $addToSet: { seenFeatures: featureKey } },
      { returnDocument: 'after' }
    );

    res.json({ 
      message: 'Feature marked as seen', 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email, 
        seenFeatures: admin.seenFeatures
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const DeviceRegistry = require('../models/DeviceRegistry');

// Register Device for Push Notifications
router.post('/register-device', auth, async (req, res) => {
  try {
    const { deviceId, pushToken, platform } = req.body;
    
    if (!deviceId || !pushToken || !platform) {
      return res.status(400).json({ message: 'Missing required device information' });
    }

    let authorizedStoreId = req.admin.storeId;
    if (!authorizedStoreId && req.admin.role === 'vendor') {
      const Store = require('../models/Store');
      const vendorStore = await Store.findOne({ admin: req.admin._id });
      if (vendorStore) {
        authorizedStoreId = vendorStore._id;
      }
    }
    
    // Fallback to admin _id if still not found
    authorizedStoreId = authorizedStoreId || req.admin._id;

    // Use findOneAndUpdate with upsert to either update an existing device or create a new one
    await DeviceRegistry.findOneAndUpdate(
      { deviceId },
      {
        userId: req.admin._id,
        storeId: authorizedStoreId,
        pushToken,
        platform,
        active: true,
        lastSeen: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true, message: 'Device registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deregister Device (e.g., on Logout)
router.post('/deregister-device', auth, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ message: 'Device ID required' });

    // Mark as inactive instead of deleting to keep a record, or just delete it.
    await DeviceRegistry.findOneAndUpdate(
      { deviceId, userId: req.admin._id },
      { active: false }
    );

    res.json({ success: true, message: 'Device deregistered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

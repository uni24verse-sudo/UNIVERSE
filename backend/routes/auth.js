const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, upiId } = req.body;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: 'Email already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({ name, email, password: hashedPassword, upiId });
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

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    // Create and assign token
    const token = jwt.sign({ _id: admin._id, name: admin.name }, process.env.JWT_SECRET, { expiresIn: '10h' });
    res.header('Authorization', token).json({ token, admin: { id: admin._id, name: admin.name, email: admin.email, upiId: admin.upiId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { 
      name, upiId, 
      phonepeMerchantId, phonepeSaltKey, phonepeSaltIndex,
      paytmMerchantId, paytmMerchantKey, paytmWebsite, paytmEnv
    } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: 'Vendor not found' });

    if (name) admin.name = name;
    if (upiId !== undefined) admin.upiId = upiId;
    
    // Update Payment Credentials
    if (phonepeMerchantId !== undefined) admin.phonepeMerchantId = phonepeMerchantId;
    if (phonepeSaltKey !== undefined) admin.phonepeSaltKey = phonepeSaltKey;
    if (phonepeSaltIndex !== undefined) admin.phonepeSaltIndex = phonepeSaltIndex;
    if (paytmMerchantId !== undefined) admin.paytmMerchantId = paytmMerchantId;
    if (paytmMerchantKey !== undefined) admin.paytmMerchantKey = paytmMerchantKey;
    if (paytmWebsite !== undefined) admin.paytmWebsite = paytmWebsite;
    if (paytmEnv !== undefined) admin.paytmEnv = paytmEnv;

    await admin.save();
    
    res.json({ 
      message: 'Profile updated successfully', 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email, 
        upiId: admin.upiId,
        phonepeMerchantId: admin.phonepeMerchantId,
        phonepeSaltKey: admin.phonepeSaltKey,
        phonepeSaltIndex: admin.phonepeSaltIndex,
        paytmMerchantId: admin.paytmMerchantId,
        paytmMerchantKey: admin.paytmMerchantKey,
        paytmWebsite: admin.paytmWebsite
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Test OneSignal Notification
router.post('/test-fcm', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const testData = {
      title: '🔔 OneSignal Test',
      body: 'If you see this, your background notifications are working perfectly with OneSignal!',
      type: 'test',
      clickAction: '/vendor/dashboard'
    };

    const success = await notificationService.sendToUser(admin._id, testData);
    
    if (success) {
      res.json({ message: 'Test notification sent successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to send test notification via OneSignal' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

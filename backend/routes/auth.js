const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

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
    const { name, upiId } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: 'Vendor not found' });

    if (name) admin.name = name;
    if (upiId !== undefined) admin.upiId = upiId;

    await admin.save();
    res.json({ message: 'Profile updated successfully', admin: { id: admin._id, name: admin.name, email: admin.email, upiId: admin.upiId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save FCM Token
router.put('/fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'Token is required' });
    
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: 'Vendor not found' });

    admin.fcmToken = fcmToken;
    await admin.save();
    
    res.json({ message: 'FCM Token saved successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

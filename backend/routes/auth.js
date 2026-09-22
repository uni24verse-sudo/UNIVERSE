const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const prisma = require('../config/prisma');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, stallName, telegramChatId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({ where: { email: cleanEmail } });
    if (existingAdmin) return res.status(400).json({ message: 'Email already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const id = crypto.randomUUID();
    let storeId = '';

    if (stallName && stallName.trim()) {
      storeId = crypto.randomUUID();
    }

    await prisma.admin.create({
      data: {
        id,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        telegramChatId: telegramChatId || (phone ? phone.trim() : ''),
        role: 'vendor',
        status: 'PENDING_APPROVAL',
        storeId
      }
    });

    // If proposed stall name is provided, create pending store
    if (storeId) {
      await prisma.store.create({
        data: {
          id: storeId,
          adminId: id,
          name: stallName.trim(),
          isOpen: false,
          isHidden: true,
          subscriptionStatus: 'pending_approval'
        }
      });
    }

    res.status(201).json({ 
      success: true,
      status: 'PENDING_APPROVAL',
      message: 'Registration submitted successfully! Your account is pending Super Admin verification before you can log in.' 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const admin = await prisma.admin.findUnique({ 
      where: { email: cleanEmail },
      include: { stores: true }
    });

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

    // Check if vendor account is pending verification by Super Admin
    if (admin.role === 'vendor' && admin.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        status: 'PENDING_APPROVAL',
        message: 'Your vendor account is pending verification by Super Admin. You will be able to log in once approved.'
      });
    }

    const adminId = admin.id;

    // Retrieve actual storeId dynamically
    let actualStoreId = admin.storeId || admin.stores?.[0]?.id;
    if (!actualStoreId && admin.role === 'vendor') {
      const vendorStore = await prisma.store.findFirst({ where: { adminId } });
      if (vendorStore) {
        actualStoreId = vendorStore.id;
      }
    }

    // Create and assign token with role and storeId
    const token = jwt.sign(
      { _id: adminId, id: adminId, name: admin.name, role: admin.role, storeId: actualStoreId, vendorId: admin.vendorId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.header('Authorization', token).json({ 
      token, 
      admin: { 
        id: adminId, 
        _id: adminId,
        name: admin.name, 
        email: admin.email, 
        telegramChatId: admin.telegramChatId,
        role: admin.role,
        storeId: actualStoreId,
        vendorId: admin.vendorId
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
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const admin = await prisma.admin.findUnique({
      where: { email: cleanEmail },
      include: { stores: true }
    });

    if (!admin) return res.status(400).json({ message: 'Invalid email or password' });

    // Check if banned or inactive
    if (admin.isBanned || admin.status === 'INACTIVE') {
      return res.status(403).json({ message: 'Your account is inactive or suspended.' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    const adminId = admin.id;

    // Retrieve actual storeId dynamically
    let actualStoreId = admin.storeId || admin.stores?.[0]?.id;
    if (!actualStoreId && admin.role === 'vendor') {
      const vendorStore = await prisma.store.findFirst({ where: { adminId } });
      if (vendorStore) {
        actualStoreId = vendorStore.id;
      }
    }

    // Create and assign token
    const tokenPayload = { 
      _id: adminId, 
      id: adminId,
      name: admin.name,
      role: admin.role,
      storeId: actualStoreId,
      vendorId: admin.vendorId
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.header('Authorization', token).json({ 
      token, 
      admin: { 
        id: adminId, 
        _id: adminId,
        name: admin.name, 
        email: admin.email,
        role: admin.role,
        storeId: actualStoreId,
        vendorId: admin.vendorId
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
    const adminId = req.admin.id || req.admin._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;

    const admin = await prisma.admin.update({
      where: { id: String(adminId) },
      data: updateData
    });
    
    res.json({ 
      message: 'Profile updated successfully', 
      admin: { 
        id: admin.id, 
        _id: admin.id,
        name: admin.name, 
        email: admin.email, 
        telegramChatId: admin.telegramChatId
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register Device for Push Notifications
router.post('/register-device', auth, async (req, res) => {
  try {
    const { deviceId, pushToken, platform } = req.body;
    
    if (!deviceId || !pushToken || !platform) {
      return res.status(400).json({ message: 'Missing required device information' });
    }

    const adminId = req.admin.id || req.admin._id;
    let authorizedStoreId = req.admin.storeId;
    if (!authorizedStoreId && req.admin.role === 'vendor') {
      const vendorStore = await prisma.store.findFirst({ where: { adminId: String(adminId) } });
      if (vendorStore) {
        authorizedStoreId = vendorStore.id;
      }
    }
    
    authorizedStoreId = authorizedStoreId || adminId;

    await prisma.deviceRegistry.upsert({
      where: { token: String(pushToken) },
      update: {
        userId: String(adminId),
        storeId: String(authorizedStoreId),
        deviceId: String(deviceId),
        pushToken: String(pushToken),
        platform: platform || 'android',
        active: true,
        lastSeen: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        userId: String(adminId),
        storeId: String(authorizedStoreId),
        deviceId: String(deviceId),
        pushToken: String(pushToken),
        token: String(pushToken),
        platform: platform || 'android',
        active: true,
        lastSeen: new Date()
      }
    });

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

    await prisma.deviceRegistry.updateMany({
      where: { deviceId: String(deviceId) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Device deregistered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

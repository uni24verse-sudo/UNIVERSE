const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const prisma = require('../config/prisma');

// Middleware to verify vendor owns the store
const verifyVendorStore = async (req, res, next) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const store = await prisma.store.findFirst({
      where: {
        id: req.params.storeId,
        ...(req.admin.role !== 'superadmin' && { adminId: String(adminId) })
      }
    });

    if (!store) {
      return res.status(403).json({ message: 'Unauthorized: Store not found or does not belong to you.' });
    }
    req.store = store;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all employees for a store
router.get('/:storeId', auth, verifyVendorStore, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const employees = await prisma.admin.findMany({
      where: { 
        vendorId: String(adminId), 
        storeId: req.params.storeId, 
        role: 'staff' 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeId: true,
        vendorId: true,
        status: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json(employees.map(e => ({ ...e, _id: e.id })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new employee
router.post('/:storeId', auth, verifyVendorStore, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email/phone, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: cleanEmail }
    });
    if (existingAdmin) {
      return res.status(400).json({ message: 'This email/phone is already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const adminId = req.admin.id || req.admin._id;

    const savedEmployee = await prisma.admin.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: 'staff',
        storeId: req.params.storeId,
        vendorId: String(adminId),
        status: 'ACTIVE'
      }
    });
    
    const empObj = { ...savedEmployee, _id: savedEmployee.id };
    delete empObj.password;

    res.status(201).json(empObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update employee details
router.put('/:storeId/:employeeId', auth, verifyVendorStore, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const adminId = req.admin.id || req.admin._id;
    
    const employee = await prisma.admin.findFirst({
      where: { 
        id: req.params.employeeId, 
        vendorId: String(adminId), 
        storeId: req.params.storeId,
        role: 'staff'
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== employee.email) {
        const existing = await prisma.admin.findUnique({ where: { email: cleanEmail } });
        if (existing) return res.status(400).json({ message: 'This email/phone is already in use.' });
        updateData.email = cleanEmail;
      }
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedEmployee = await prisma.admin.update({
      where: { id: req.params.employeeId },
      data: updateData
    });

    const empObj = { ...updatedEmployee, _id: updatedEmployee.id };
    delete empObj.password;

    res.json(empObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH toggle employee status
router.patch('/:storeId/:employeeId/status', auth, verifyVendorStore, async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const adminId = req.admin.id || req.admin._id;
    const employee = await prisma.admin.findFirst({
      where: { 
        id: req.params.employeeId, 
        vendorId: String(adminId), 
        storeId: req.params.storeId,
        role: 'staff'
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const updatedEmployee = await prisma.admin.update({
      where: { id: req.params.employeeId },
      data: { status }
    });
    
    const empObj = { ...updatedEmployee, _id: updatedEmployee.id };
    delete empObj.password;

    res.json(empObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE revoke employee access
router.delete('/:storeId/:employeeId', auth, verifyVendorStore, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const employee = await prisma.admin.findFirst({
      where: { 
        id: req.params.employeeId, 
        vendorId: String(adminId), 
        storeId: req.params.storeId,
        role: 'staff'
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    await prisma.admin.delete({
      where: { id: employee.id }
    });

    res.json({ message: 'Employee deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

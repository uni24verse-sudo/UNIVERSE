const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Admin = require('../models/Admin');
const Store = require('../models/Store');
const bcrypt = require('bcryptjs');

// Middleware to verify vendor owns the store
const verifyVendorStore = async (req, res, next) => {
  try {
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
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
    const employees = await Admin.find({ 
      vendorId: req.admin._id, 
      storeId: req.params.storeId, 
      role: 'staff' 
    }).select('-password'); // Exclude password from response
    
    res.json(employees);
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

    // Check if email/phone already in use across the entire Admin model
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'This email/phone is already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new Admin({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
      storeId: req.params.storeId,
      vendorId: req.admin._id,
      status: 'ACTIVE'
    });

    const savedEmployee = await newEmployee.save();
    
    // Return without password
    const empObj = savedEmployee.toObject();
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
    
    const employee = await Admin.findOne({ 
      _id: req.params.employeeId, 
      vendorId: req.admin._id, 
      storeId: req.params.storeId,
      role: 'staff'
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (name) employee.name = name;
    if (email) {
      // Check if new email is taken
      if (email !== employee.email) {
        const existing = await Admin.findOne({ email });
        if (existing) return res.status(400).json({ message: 'This email/phone is already in use.' });
        employee.email = email;
      }
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    const updatedEmployee = await employee.save();
    const empObj = updatedEmployee.toObject();
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

    const employee = await Admin.findOne({ 
      _id: req.params.employeeId, 
      vendorId: req.admin._id, 
      storeId: req.params.storeId,
      role: 'staff'
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    employee.status = status;
    const updatedEmployee = await employee.save();
    
    const empObj = updatedEmployee.toObject();
    delete empObj.password;

    res.json(empObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE revoke employee access
router.delete('/:storeId/:employeeId', auth, verifyVendorStore, async (req, res) => {
  try {
    const employee = await Admin.findOne({ 
      _id: req.params.employeeId, 
      vendorId: req.admin._id, 
      storeId: req.params.storeId,
      role: 'staff'
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    await Admin.findByIdAndDelete(employee._id);

    res.json({ message: 'Employee deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Admin = require('../models/Admin');
const upiService = require('../services/upiService');

// Update vendor UPI configuration
router.put('/configure', auth, async (req, res) => {
  try {
    const { merchantUpiId, businessName, bankName, upiType } = req.body;
    const adminId = req.admin._id;

    // Find the admin/vendor
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate UPI ID if provided
    if (merchantUpiId) {
      const validation = upiService.validateUpiId(merchantUpiId);
      if (!validation.valid) {
        return res.status(400).json({ 
          message: 'Invalid UPI ID', 
          error: validation.error 
        });
      }
      
      // Update UPI configuration
      admin.merchantUpiId = merchantUpiId;
      admin.upiType = validation.type;
      admin.isUpiVerified = validation.type === 'merchant';
    }

    // Update other fields
    if (businessName) admin.businessName = businessName;
    if (bankName) admin.bankName = bankName;
    if (upiType) admin.upiType = upiType;

    await admin.save();

    // Get updated validation
    const validation = admin.merchantUpiId ? 
      upiService.validateUpiId(admin.merchantUpiId) : null;

    res.json({
      message: 'UPI configuration updated successfully',
      config: {
        merchantUpiId: admin.merchantUpiId,
        businessName: admin.businessName,
        bankName: admin.bankName,
        upiType: admin.upiType,
        isUpiVerified: admin.isUpiVerified
      },
      validation: validation,
      recommendations: validation?.type === 'personal' ? 
        upiService.getRecommendedProviders() : null
    });

  } catch (error) {
    console.error('Error updating UPI configuration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current UPI configuration
router.get('/config', auth, async (req, res) => {
  try {
    const adminId = req.admin._id;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate current UPI IDs
    const personalValidation = admin.upiId ? 
      upiService.validateUpiId(admin.upiId) : null;
    
    const merchantValidation = admin.merchantUpiId ? 
      upiService.validateUpiId(admin.merchantUpiId) : null;

    res.json({
      config: {
        upiId: admin.upiId,
        merchantUpiId: admin.merchantUpiId,
        businessName: admin.businessName,
        bankName: admin.bankName,
        upiType: admin.upiType,
        isUpiVerified: admin.isUpiVerified
      },
      validation: {
        personal: personalValidation,
        merchant: merchantValidation
      },
      status: {
        hasMerchantUpi: !!admin.merchantUpiId,
        isVerified: admin.isUpiVerified,
        needsUpgrade: personalValidation?.type === 'personal' && !admin.merchantUpiId
      }
    });

  } catch (error) {
    console.error('Error getting UPI configuration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test UPI ID validation
router.post('/validate', (req, res) => {
  try {
    const { upiId } = req.body;
    
    if (!upiId) {
      return res.status(400).json({ message: 'UPI ID is required' });
    }

    const validation = upiService.validateUpiId(upiId);
    const upiInfo = upiService.getUpiInfo(upiId);
    
    res.json({
      upiId: upiId,
      validation: validation,
      info: upiInfo,
      recommendations: validation.type === 'personal' ? 
        upiService.getRecommendedProviders() : null
    });

  } catch (error) {
    console.error('Error validating UPI ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get merchant UPI setup guide
router.get('/setup-guide', (req, res) => {
  try {
    const guide = {
      title: 'Merchant UPI Setup Guide',
      description: 'Switch to merchant UPI to eliminate payment warnings and increase limits',
      steps: [
        {
          step: 1,
          title: 'Choose a Provider',
          description: 'Select from recommended merchant UPI providers',
          providers: upiService.getRecommendedProviders()
        },
        {
          step: 2,
          title: 'Download Business App',
          description: 'Download the business app from Play Store or App Store',
          note: 'Use the business version, not the regular consumer app'
        },
        {
          step: 3,
          title: 'Complete KYC',
          description: 'Complete business KYC with your business documents',
          documents: ['PAN Card', 'Business Registration', 'Bank Account Details']
        },
        {
          step: 4,
          title: 'Get Merchant UPI ID',
          description: 'Your merchant UPI ID will be generated automatically',
          examples: ['yourbusiness@yblbiz', 'yourbusiness@paytmpaymentsbank']
        },
        {
          step: 5,
          title: 'Update in UniVerse',
          description: 'Add your merchant UPI ID in the UniVerse vendor dashboard',
          action: 'Use the UPI configuration endpoint to update'
        }
      ],
      benefits: [
        'No payment risk warnings',
        'Higher daily transaction limits',
        'Professional business appearance',
        'Instant payment settlements',
        'Business analytics and insights'
      ],
      timeline: {
        setup: '15-30 minutes',
        verification: '1-24 hours',
        activation: 'Immediate after verification'
      }
    };

    res.json(guide);

  } catch (error) {
    console.error('Error getting setup guide:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

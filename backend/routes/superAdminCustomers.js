const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const OrderEvent = require('../models/OrderEvent');
const auditService = require('../services/auditService');
const refundService = require('../services/refundService');

// All routes require Super Admin Authentication
router.use(superAdminAuth);

/**
 * 1. GET ALL CUSTOMERS (Directory with Search & Filter)
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20, status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { userId: regex },
        { phone: regex },
        { currentName: regex },
        { email: regex }
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Global Database Summary across all customers
    const summaryAgg = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalGMV: { $sum: '$metrics.totalSpent' },
          totalOrders: { $sum: '$metrics.totalOrders' },
          completedOrders: { $sum: '$metrics.completedOrders' },
          totalRefunded: { $sum: '$metrics.totalRefunded' }
        }
      }
    ]);

    const summary = summaryAgg[0] || {
      totalCustomers: total,
      totalGMV: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalRefunded: 0
    };

    res.json({
      success: true,
      customers,
      total,
      summary,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('[superAdminCustomers] Error listing customers:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. GET SINGLE CUSTOMER 360° INTELLIGENCE PROFILE
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const customer = await Customer.findOne({ userId });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch full historical order ledger for this customer
    const orders = await Order.find({ userId })
      .populate('store', 'name address')
      .sort({ createdAt: -1 });

    // Fetch all refunds associated with this customer
    const refunds = await Refund.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      customer,
      orders,
      refunds
    });
  } catch (err) {
    console.error('[superAdminCustomers] Error getting customer 360:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. GET FULL AUDIT TRAIL / TIMELINE FOR AN ORDER
 */
router.get('/orders/:orderId/timeline', async (req, res) => {
  try {
    const { orderId } = req.params;
    const timeline = await auditService.getOrderTimeline(orderId);
    res.json({
      success: true,
      timeline
    });
  } catch (err) {
    console.error('[superAdminCustomers] Error getting order timeline:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. ISSUE INSTANT REFUND FOR AN ORDER
 */
router.post('/orders/:orderId/refund', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = 'Super Admin initiated refund' } = req.body;

    const result = await refundService.processAutomatedRefund({
      orderId,
      reason,
      actorType: 'SUPER_ADMIN',
      actorId: req.superAdmin?.email || 'SUPER_ADMIN'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[superAdminCustomers] Error processing refund:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

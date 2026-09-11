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
    const prisma = require('../config/prisma');
    const { normalizeCustomer } = require('../utils/pgAdapter');

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { userId: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
        { currentName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const total = await prisma.customer.count({ where });
    const pgCustomers = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const customers = pgCustomers.map(normalizeCustomer);

    // Compute live summary across all real customers in PostgreSQL
    const allCustomers = await prisma.customer.findMany({ select: { metrics: true } });
    let totalGMV = 0;
    let totalOrders = 0;
    let completedOrders = 0;
    let totalRefunded = 0;

    for (const c of allCustomers) {
      const m = c.metrics || {};
      totalGMV += (m.totalSpent || 0);
      totalOrders += (m.totalOrders || 0);
      completedOrders += (m.completedOrders || 0);
      totalRefunded += (m.totalRefunded || 0);
    }

    const summary = {
      totalCustomers: allCustomers.length,
      totalGMV,
      totalOrders,
      completedOrders,
      totalRefunded
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
    const prisma = require('../config/prisma');
    const { normalizeCustomer, normalizeOrder, normalizeRefund } = require('../utils/pgAdapter');

    let customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      customer = await Customer.findOne({ userId });
    }

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch full historical order ledger from PostgreSQL
    const pgOrders = await prisma.order.findMany({
      where: { userId },
      include: { store: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch all refunds from PostgreSQL
    const pgRefunds = await prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      customer: normalizeCustomer(customer),
      orders: pgOrders.map(normalizeOrder),
      refunds: pgRefunds.map(normalizeRefund)
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

    const result = await refundService.handleOrderCancellation({
      orderId,
      reason,
      actorType: 'SUPER_ADMIN',
      actorId: req.superAdmin?.email || 'SUPER_ADMIN',
      io: req.app.get('io')
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

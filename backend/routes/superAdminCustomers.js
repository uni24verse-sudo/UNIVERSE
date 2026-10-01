const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const { normalizeCustomer, normalizeOrder, normalizeRefund } = require('../utils/pgAdapter');
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

    const customer = await prisma.customer.findUnique({ where: { userId } });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch full historical order ledger from PostgreSQL (matched by userId or phone)
    const cleanPhone = (customer.phone || '').replace(/\D/g, '').slice(-10);
    const pgOrders = await prisma.order.findMany({
      where: {
        OR: [
          { userId },
          ...(cleanPhone ? [{ customerPhone: { contains: cleanPhone } }] : [])
        ]
      },
      include: { store: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch all refunds from PostgreSQL
    const pgRefunds = await prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const normalizedOrders = pgOrders.map(normalizeOrder);

    // Extract promotional intelligence: orders where coupons/discounts were applied
    let totalDiscountSaved = 0;
    const offersHistory = [];
    const usedCouponsMap = {};

    normalizedOrders.forEach(ord => {
      const discount = Number(ord.discountAmount) || 0;
      const offer = (ord.appliedOffer && typeof ord.appliedOffer === 'object' && Object.keys(ord.appliedOffer).length > 0) ? ord.appliedOffer : null;
      const hasOffer = Boolean(offer && (offer.code || offer.title || offer.id)) || discount > 0;

      if (hasOffer) {
        totalDiscountSaved += discount;
        const code = (offer?.code || offer?.badgeText || 'SPECIAL OFFER').toUpperCase();
        usedCouponsMap[code] = (usedCouponsMap[code] || 0) + 1;

        offersHistory.push({
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          storeId: ord.storeId,
          storeName: ord.store?.name || 'Campus Counter',
          date: ord.createdAt,
          orderTotal: ord.totalAmount,
          discountAmount: discount,
          appliedOffer: offer || { badgeText: `Saved ₹${discount}` },
          orderStatus: ord.status,
          paymentStatus: ord.paymentStatus
        });
      }
    });

    const promoIntelligence = {
      totalDiscountSaved: Math.round(totalDiscountSaved * 100) / 100,
      totalPromotionalOrders: offersHistory.length,
      offersHistory,
      favoriteCoupons: Object.entries(usedCouponsMap).map(([code, count]) => ({ code, count }))
    };

    res.json({
      success: true,
      customer: normalizeCustomer(customer),
      orders: normalizedOrders,
      refunds: pgRefunds.map(normalizeRefund),
      promoIntelligence,
      offersHistory
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
      actorId: req.admin?.email || 'SUPER_ADMIN',
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

/**
 * 5. DELETE SINGLE CUSTOMER
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [{ userId }, { id: userId }]
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await prisma.customer.delete({
      where: { id: existing.id }
    });

    res.json({ success: true, message: `Customer profile for "${existing.currentName || existing.phone}" removed successfully.` });
  } catch (err) {
    console.error('[superAdminCustomers] Delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. BULK DELETE CUSTOMERS
 */
router.post('/bulk-delete', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'No customer IDs provided for bulk deletion' });
    }

    const result = await prisma.customer.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { id: { in: userIds } }
        ]
      }
    });

    res.json({
      success: true,
      message: `Successfully removed ${result.count} customer profiles.`,
      count: result.count
    });
  } catch (err) {
    console.error('[superAdminCustomers] Bulk delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


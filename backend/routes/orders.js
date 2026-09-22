const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const prisma = require('../config/prisma');
const { normalizeOrder, normalizeRefund } = require('../utils/pgAdapter');
const notificationService = require('../services/notificationService');
const journeyEngineService = require('../services/journeyEngineService');
const orderRepository = require('../repositories/orderRepository');
const customerRepository = require('../repositories/customerRepository');
const auditService = require('../services/auditService');
const refundService = require('../services/refundService');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Generate a cryptographically secure random token (hex string)
const generateSecureToken = () => crypto.randomBytes(16).toString('hex');

// Helper to parse scheduled pickup time in Indian Standard Time (IST, UTC + 5:30)
function parseScheduledTimeIST(scheduledTimeStr) {
  if (!scheduledTimeStr) return null;
  const trimmed = scheduledTimeStr.trim().toUpperCase();
  const isPM = trimmed.includes('PM');
  const isAM = trimmed.includes('AM');
  const cleanStr = trimmed.replace(/[^\d:]/g, '');
  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  // Real-world IST time computation (UTC + 5:30)
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istNow = new Date(utcMs + (5.5 * 3600000));

  const istScheduled = new Date(istNow);
  istScheduled.setHours(hours, minutes, 0, 0);

  const diffMinutes = (istScheduled.getTime() - istNow.getTime()) / (1000 * 60);
  return {
    diffMinutes,
    hours,
    minutes,
    formattedTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  };
}

// Create a new Order (Public Customer endpoint)
// NOTE: For Razorpay checkouts, use /api/payments/razorpay/verify
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = req.body;

    const store = await prisma.store.findUnique({
      where: { id: String(storeId) },
      include: { admin: true }
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    let deadlineMinutes = isPreOrder ? 15 : (isQRScan ? null : 5);
    let acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        storeId: String(storeId),
        orderNumber,
        items: Array.isArray(items) ? items : [],
        totalAmount: Number(totalAmount) || 0,
        paymentMethod: paymentMethod || 'UPI',
        customerPhone: String(customerPhone || ''),
        customerName: customerName || 'UniVerse Student',
        orderType: orderType || 'Dine In',
        packagingChargeApplied: Number(packagingChargeApplied) || 0,
        status: 'Payment Pending',
        paymentStatus: 'Pending',
        isPreOrder: Boolean(isPreOrder),
        scheduledTime: scheduledTime || ''
      },
      include: { store: true }
    });

    const savedOrder = normalizeOrder(createdOrder);
    console.log(`[orders.create] Order #${savedOrder.orderNumber} created, awaiting payment...`);
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's Orders (Protected, Store Specific)
router.get('/:storeId/vendor-orders', auth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const adminId = req.admin.id || req.admin._id;

    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (store.adminId !== String(adminId) && req.admin.storeId !== storeId && req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access to store orders' });
    }

    const orders = await orderRepository.getVendorOrders(storeId);
    return res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Order Status (Protected)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // 1. Authorize: Ensure user has permissions
    if (req.admin.role === 'staff') {
      const perms = req.admin.permissions || [];
      if (!perms.includes('UPDATE_ORDER_STATUS') && !perms.includes('MARK_ORDER_READY')) {
        return res.status(403).json({ message: 'Unauthorized: Missing required permissions' });
      }
      if (status === 'Ready' && !perms.includes('MARK_ORDER_READY')) {
        return res.status(403).json({ message: 'Unauthorized: Missing MARK_ORDER_READY permission' });
      }
    }

    // 2. Strict State Machine Rules
    const validTransitions = {
      'Confirmed': ['Pending'],
      'Cooking': ['Confirmed'],
      'Ready': ['Cooking', 'Confirmed'],
      'Completed': ['Ready'],
      'Cancelled': ['Payment Pending', 'Pending', 'Confirmed'] 
    };

    if (!validTransitions[status]) {
      return res.status(400).json({ message: 'Invalid or unsupported status transition requested.' });
    }

    const expectedCurrentStatuses = validTransitions[status];
    const adminId = String(req.admin.id || req.admin._id);
    const storeId = req.admin.storeId ? String(req.admin.storeId) : '';

    const existingOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { store: true }
    });
    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });

    if (req.admin.role !== 'superadmin') {
      const isStoreMatch = (storeId && existingOrder.storeId === storeId) || existingOrder.storeId === adminId;
      const isAdminMatch = existingOrder.store?.adminId === adminId || (storeId && existingOrder.store?.adminId === storeId);
      if (!isStoreMatch && !isAdminMatch) {
        return res.status(403).json({ message: 'Unauthorized: Order belongs to another store.' });
      }
    }

    if (!expectedCurrentStatuses.includes(existingOrder.status)) {
      return res.status(409).json({ 
        message: `Order has already moved to ${existingOrder.status}. Transition to ${status} is invalid.`,
        currentStatus: existingOrder.status 
      });
    }

    // PRE-ORDER STRICT TIME LOCK (Evaluated in Indian Standard Time, UTC + 5:30)
    if (existingOrder.isPreOrder && existingOrder.scheduledTime) {
      if (status === 'Cooking' || status === 'Ready') {
        const parsed = parseScheduledTimeIST(existingOrder.scheduledTime);
        if (parsed && parsed.diffMinutes > 20) {
          return res.status(403).json({ 
            message: `Too early to prepare! Please wait until there is less than 20 minutes left before ${existingOrder.scheduledTime}. (Current: ${Math.round(parsed.diffMinutes)} mins left)` 
          });
        }
      }
    }

    const updateData = { status };
    if (status === 'Ready') {
      updateData.handoverToken = generateSecureToken();
    }

    const updatedPgOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: { store: true }
    });

    const updatedOrder = normalizeOrder(updatedPgOrder);

    // If order was cancelled / rejected by vendor, trigger direct UPI refund queue and team alert
    if (status === 'Cancelled') {
      const reason = req.body.reason || 'Kitchen closed or item out of stock';
      refundService.handleOrderCancellation({
        orderId: updatedOrder.id,
        reason,
        actorType: 'VENDOR_STAFF',
        actorId: req.admin?.name || 'VENDOR_STAFF',
        io: req.app.get('io')
      }).catch(err => console.error('[OrderUpdate] Cancellation refund error:', err.message));
    } else {
      let eventType = 'ORDER_ACCEPTED';
      if (status === 'Cooking') eventType = 'ORDER_COOKING';
      else if (status === 'Ready') eventType = 'ORDER_READY';
      else if (status === 'Completed') eventType = 'ORDER_COMPLETED';

      auditService.logEvent({
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        userId: updatedOrder.userId,
        actorType: 'VENDOR_STAFF',
        actorId: req.admin?.name || 'VENDOR_STAFF',
        eventType,
        oldStatus: expectedCurrentStatuses[0] || 'Pending',
        newStatus: status,
        metadata: {
          storeName: updatedOrder.store?.name || 'Kitchen Counter',
          prepTime: status === 'Ready' ? new Date() : null,
          handoverMethod: status === 'Completed' ? 'DIRECT_STATUS_UPDATE' : null
        }
      }).catch(err => console.error('[AuditService] Log event error:', err.message));
    }

    const io = req.app.get('io');
    if (io) {
      io.to(updatedOrder.id).emit('order_status_update', updatedOrder);
      if (updatedOrder.storeId) {
        io.to(updatedOrder.storeId).emit('order_status_update', updatedOrder);
      }
      io.to('superadmin_room').emit('superadmin:order_update', updatedOrder);
    }

    // Trigger / Resume Lifecycle Journey Automation across all order status transitions
    if (updatedOrder.customerPhone) {
      const orderPayload = {
        userId: updatedOrder.userId || updatedOrder.customerPhone,
        name: updatedOrder.customerName || 'Student',
        phone: updatedOrder.customerPhone,
        metadata: {
          orderId: updatedOrder.orderNumber || updatedOrder.id,
          orderNumber: updatedOrder.orderNumber || '',
          storeName: updatedOrder.store?.name || 'Campus Food Court',
          amount: updatedOrder.totalAmount
        }
      };

      if (status === 'Cooking' || status === 'Confirmed') {
        journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Accepted', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Accepted resume error:', e.message));
        journeyEngineService.triggerEvent('Order Accepted', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Accepted trigger error:', e.message));
      } else if (status === 'Ready') {
        journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Ready', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Ready resume error:', e.message));
        journeyEngineService.triggerEvent('Order Ready', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Ready trigger error:', e.message));
      } else if (status === 'Completed') {
        journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Completed', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Completed resume error:', e.message));
        journeyEngineService.triggerEvent('Order Completed', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Completed trigger error:', e.message));
      } else if (status === 'Cancelled') {
        journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Rejected', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Rejected resume error:', e.message));
      }
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel Order (Customer - only if Payment Pending)
router.delete('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.status !== 'Payment Pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    await prisma.order.delete({ where: { id: req.params.id } });
    
    const io = req.app.get('io');
    if (io) {
      const normalized = normalizeOrder(order);
      io.to(order.storeId).emit('order_cancelled', normalized);
      io.to('superadmin_room').emit('superadmin:order_cancelled', normalized);
    }
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Order Status (Public, for customer tracking)
router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id;

    const pgOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: param },
          { orderNumber: param }
        ]
      },
      include: {
        store: {
          include: {
            admin: { select: { id: true, name: true, email: true } }
          }
        },
        refunds: true
      }
    });

    if (!pgOrder) return res.status(404).json({ message: 'Order not found' });
    res.json(normalizeOrder(pgOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Order Handover via QR (Protected)
router.put('/verify-handover', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const handoverToken = req.body.handoverToken || req.body.token;

    if (!orderId || !handoverToken) {
      return res.status(400).json({ message: 'Order ID and Handover Token are required' });
    }

    const adminId = String(req.admin.id || req.admin._id);
    const storeId = String(req.admin.storeId || '');

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      },
      include: { store: true }
    });

    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });

    if (req.admin.role !== 'superadmin') {
      const isStoreMatch = (storeId && existingOrder.storeId === storeId) || existingOrder.storeId === adminId;
      const isAdminMatch = existingOrder.store?.adminId === adminId || (storeId && existingOrder.store?.adminId === storeId);
      if (!isStoreMatch && !isAdminMatch) {
        return res.status(403).json({ message: 'Unauthorized: Order belongs to another store' });
      }
    }

    if (existingOrder.status === 'Completed') {
      return res.status(409).json({ message: 'Order already handed over and completed.' });
    }

    if (existingOrder.status !== 'Ready') {
      return res.status(409).json({ message: `Cannot handover. Order is currently in ${existingOrder.status} state.` });
    }

    const expectedToken = String(existingOrder.handoverToken || '').trim().toUpperCase();
    const providedToken = String(handoverToken).trim().toUpperCase();

    if (expectedToken !== providedToken) {
      return res.status(400).json({ message: 'Invalid or expired handover token.' });
    }

    const updated = await prisma.order.update({
      where: { id: existingOrder.id },
      data: { status: 'Completed' },
      include: { store: true }
    });

    const updatedOrder = normalizeOrder(updated);

    const io = req.app.get('io');
    if (io) {
      io.to(updatedOrder.id).emit('order_status_update', updatedOrder);
      if (updatedOrder.storeId) {
        io.to(updatedOrder.storeId).emit('order_status_update', updatedOrder);
      }
    }

    auditService.logEvent({
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
      actorType: 'VENDOR_STAFF',
      actorId: req.admin?.name || 'VENDOR_STAFF',
      eventType: 'ORDER_COMPLETED',
      oldStatus: 'Ready',
      newStatus: 'Completed',
      metadata: {
        storeName: updatedOrder.store?.name || 'Kitchen Counter',
        handoverTime: new Date()
      }
    }).catch(err => console.error('[AuditService] Handover log error:', err.message));

    if (updatedOrder.customerPhone) {
      const orderPayload = {
        userId: updatedOrder.userId || updatedOrder.customerPhone,
        name: updatedOrder.customerName || 'Student',
        phone: updatedOrder.customerPhone,
        metadata: {
          orderId: updatedOrder.orderNumber || updatedOrder.id,
          orderNumber: updatedOrder.orderNumber || '',
          storeName: updatedOrder.store?.name || 'Campus Food Court',
          amount: updatedOrder.totalAmount
        }
      };

      journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Completed', orderPayload)
        .catch(e => console.error('[JourneyEngine] Handover resume error:', e.message));
      journeyEngineService.triggerEvent('Order Completed', orderPayload)
        .catch(e => console.error('[JourneyEngine] Handover trigger error:', e.message));
    }

    res.json({ success: true, message: 'Handover verified and order completed', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper for completing orders directly (used by direct handover & complete-all-ready)
async function completeSingleOrder(existingOrder, admin, io, handoverMethod = 'DIRECT_BUTTON') {
  const updated = await prisma.order.update({
    where: { id: existingOrder.id },
    data: { status: 'Completed' },
    include: { store: true }
  });

  const updatedOrder = normalizeOrder(updated);

  if (io) {
    io.to(updatedOrder.id).emit('order_status_update', updatedOrder);
    if (updatedOrder.storeId) {
      io.to(updatedOrder.storeId).emit('order_status_update', updatedOrder);
    }
    io.to('superadmin_room').emit('superadmin:order_update', updatedOrder);
  }

  auditService.logEvent({
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    userId: updatedOrder.userId,
    actorType: 'VENDOR_STAFF',
    actorId: admin?.name || 'VENDOR_STAFF',
    eventType: 'ORDER_COMPLETED',
    oldStatus: 'Ready',
    newStatus: 'Completed',
    metadata: {
      storeName: updatedOrder.store?.name || 'Kitchen Counter',
      handoverTime: new Date(),
      handoverMethod
    }
  }).catch(err => console.error('[AuditService] Direct Handover log error:', err.message));

  if (updatedOrder.customerPhone) {
    const orderPayload = {
      userId: updatedOrder.userId || updatedOrder.customerPhone,
      name: updatedOrder.customerName || 'Student',
      phone: updatedOrder.customerPhone,
      metadata: {
        orderId: updatedOrder.orderNumber || updatedOrder.id,
        orderNumber: updatedOrder.orderNumber || '',
        storeName: updatedOrder.store?.name || 'Campus Food Court',
        amount: updatedOrder.totalAmount
      }
    };

    journeyEngineService.resumeOrderJourney(updatedOrder.id, 'Order Completed', orderPayload)
      .catch(e => console.error('[JourneyEngine] Direct Handover resume error:', e.message));
    journeyEngineService.triggerEvent('Order Completed', orderPayload)
      .catch(e => console.error('[JourneyEngine] Direct Handover trigger error:', e.message));
  }

  return updatedOrder;
}

// Direct 1-Tap Handover (No QR Scan required, Protected)
router.put('/:id/handover-direct', auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const adminId = String(req.admin.id || req.admin._id);
    const storeId = String(req.admin.storeId || '');

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      },
      include: { store: true }
    });

    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });

    if (req.admin.role !== 'superadmin') {
      const isStoreMatch = (storeId && existingOrder.storeId === storeId) || existingOrder.storeId === adminId;
      const isAdminMatch = existingOrder.store?.adminId === adminId || (storeId && existingOrder.store?.adminId === storeId);
      if (!isStoreMatch && !isAdminMatch) {
        return res.status(403).json({ message: 'Unauthorized: Order belongs to another store' });
      }
    }

    if (existingOrder.status === 'Completed') {
      return res.status(409).json({ message: 'Order is already marked as Completed.' });
    }

    if (existingOrder.status !== 'Ready') {
      return res.status(400).json({ 
        message: `Only Ready orders can be completed. Current status: ${existingOrder.status}` 
      });
    }

    const io = req.app.get('io');
    const updatedOrder = await completeSingleOrder(existingOrder, req.admin, io, 'DIRECT_BUTTON');

    res.json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} successfully handed over & completed.`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('[HandoverDirect] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Bulk Complete All Ready Orders for Store (Protected)
router.put('/store/:storeId/complete-all-ready', auth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const adminId = req.admin.id || req.admin._id;

    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (store.adminId !== String(adminId) && req.admin.storeId !== storeId && req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized access to store orders' });
    }

    // Find all ready orders for this store
    const readyOrders = await prisma.order.findMany({
      where: {
        storeId,
        status: 'Ready'
      },
      include: { store: true }
    });

    if (readyOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No orders are currently in Ready state.',
        count: 0,
        orders: []
      });
    }

    const io = req.app.get('io');
    const completedOrders = [];

    for (const order of readyOrders) {
      const completed = await completeSingleOrder(order, req.admin, io, 'BULK_COMPLETE_ALL');
      completedOrders.push(completed);
    }

    res.json({
      success: true,
      message: `Successfully completed all ${completedOrders.length} ready orders!`,
      count: completedOrders.length,
      orders: completedOrders
    });
  } catch (err) {
    console.error('[CompleteAllReady] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Quick Customer Lookup for Checkout Pre-fill (Safe, no sensitive data exposed)
router.get('/customer/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json({ exists: false });

    const customer = await customerRepository.findByPhone(phone);
    if (customer) {
      return res.json({
        exists: true,
        currentName: customer.currentName,
        email: customer.email || ''
      });
    }

    res.json({ exists: false });
  } catch (err) {
    console.error('[orders.customer.lookup] Error:', err);
    res.status(500).json({ exists: false });
  }
});

// ⚡ Request Direct UPI Refund for a Cancelled Order (Customer Facing)
router.post('/:id/request-upi-refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { upiId } = req.body;

    const result = await refundService.requestUpiRefund({
      orderId: id,
      upiId,
      io: req.app.get('io')
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[orders.request-upi-refund] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🛍️ Customer Lifetime Orders History (24/7 Unified Student Dock)
router.get('/customer/history', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json({ orders: [], activeOrders: [] });

    const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return res.json({ orders: [], activeOrders: [] });
    }

    const history = await customerRepository.getCustomerOrderHistory(cleanPhone);
    res.json(history || { orders: [], activeOrders: [], customer: null });
  } catch (err) {
    console.error('[orders.customer.history] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ⚡ 3-Minute Claim & Lock 1-Tap Mobile Payment Launchpad
router.get('/refund/claim-pay/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;

    const refund = await prisma.refund.findFirst({
      where: {
        OR: [{ id: refundId }, { refundId: refundId }]
      },
      include: {
        order: {
          include: { store: { select: { name: true, market: true } } }
        }
      }
    });

    if (!refund) {
      return res.status(404).send(`
        <div style="font-family:system-ui;text-align:center;padding:3rem 1rem;">
          <h2>❌ Refund Record Not Found</h2>
          <p>This refund link is invalid or expired.</p>
        </div>
      `);
    }

    const order = refund.order || {};

    if (refund.status === 'PROCESSED' || order.refundStatus === 'Refunded') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>UniVerse — Link Expired</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem 1rem; background: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; padding: 2.25rem 1.5rem; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 420px; margin: 1.5rem auto; border: 1.5px solid #334155;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #f87171; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.25rem; border: 2px solid #ef4444;">
              🔒
            </div>
            <div style="display: inline-block; background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 0.75rem;">
              LINK EXPIRED • REFUND COMPLETED
            </div>
            <h2 style="color: #ffffff; font-size: 1.35rem; font-weight: 900; margin: 0 0 0.5rem 0;">
              Launchpad Link Inactive
            </h2>
            <p style="color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 0 0 1.5rem 0;">
              This 1-Tap claim link was invalidated because the refund for <strong>Order #${order.orderNumber || ''}</strong> has already been successfully paid and settled.
            </p>

            <div style="background: #0f172a; padding: 1rem 1.25rem; border-radius: 16px; text-align: left; font-size: 0.85rem; border: 1px solid #334155; margin-bottom: 1.5rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.45rem;">
                <span style="color: #94a3b8;">Order:</span>
                <strong style="color: #f8fafc;">#${order.orderNumber || ''}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.45rem;">
                <span style="color: #94a3b8;">Amount Settled:</span>
                <strong style="color: #34d399; font-size: 1rem;">₹${(refund.amount || order.totalAmount || 0).toFixed(2)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.45rem;">
                <span style="color: #94a3b8;">Beneficiary UPI:</span>
                <strong style="color: #60a5fa; word-break: break-all;">${refund.customerUpiId || order.customerUpiId || 'N/A'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.45rem;">
                <span style="color: #94a3b8;">Bank UTR / Ref:</span>
                <strong style="color: #f8fafc; font-family: monospace;">${refund.utr || 'Logged in DB'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color: #94a3b8;">Settled By:</span>
                <strong style="color: #e2e8f0;">${refund.settledBy || 'Super Admin'}</strong>
              </div>
            </div>

            <a href="${process.env.FRONTEND_URL || 'https://uat.food.universeorder.co.in'}/super-admin/panel?tab=refunds" style="display: block; background: #334155; color: white; text-decoration: none; padding: 0.85rem; border-radius: 12px; font-weight: 800; font-size: 0.85rem;">
              Open Super Admin Panel
            </a>
          </div>
        </body>
        </html>
      `);
    }

    const now = new Date();
    if (refund.lockExpiresAt && refund.lockExpiresAt > now && refund.lockedBy) {
      const remainingSeconds = Math.round((refund.lockExpiresAt - now) / 1000);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Refund In Progress</title></head>
        <body style="font-family:system-ui;text-align:center;padding:2rem 1rem;background:#0f172a;color:white;">
          <div style="background:#1e293b;padding:2rem;border-radius:24px;max-width:420px;margin:2rem auto;border:1px solid #f59e0b;">
            <div style="font-size:2.5rem;margin-bottom:1rem;">⏳</div>
            <h2 style="color:#f59e0b;margin:0 0 0.5rem 0;">Payment Claim In Progress</h2>
            <p style="color:#94a3b8;font-size:0.9rem;">Admin <strong>${refund.lockedBy}</strong> is currently processing this refund.</p>
            <p style="color:#64748b;font-size:0.8rem;">Lock automatically releases in ${remainingSeconds}s.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Lock for 3 minutes
    const lockExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        lockedBy: 'WhatsApp Admin',
        lockExpiresAt
      }
    });

    const amount = Number(refund.amount || order.totalAmount || 0).toFixed(2);
    const studentName = order.customerName || refund.customerName || 'Student';
    const upiId = refund.customerUpiId || order.customerUpiId || order.payerUpiId || '';
    const cleanNote = `UniVerse${order.orderNumber || ''}`;
    const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName.replace(/[^a-zA-Z0-9 ]/g, ''))}&am=${amount}&tn=${cleanNote}&cu=INR`;
    const gpayIntent = `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=${cleanNote}&cu=INR`;
    const phonepeIntent = `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=${cleanNote}&cu=INR`;
    const paytmIntent = `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=${cleanNote}&cu=INR`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UniVerse 1-Tap Refund Launchpad</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 1.5rem 1rem; }
          .card { background: #1e293b; border-radius: 24px; padding: 1.75rem 1.25rem; max-width: 440px; margin: 0 auto; border: 1px solid #334155; }
          .btn-upi { display: block; width: 100%; padding: 1rem; margin: 0.6rem 0; border-radius: 14px; font-weight: 800; font-size: 1rem; text-decoration: none; color: white; text-align: center; }
          .gpay { background: linear-gradient(135deg, #4285F4, #34A853); }
          .phonepe { background: linear-gradient(135deg, #5f259f, #8b5cf6); }
          .paytm { background: linear-gradient(135deg, #00b9f5, #002e6e); }
          .generic { background: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="font-size:0.75rem;font-weight:800;color:#f59e0b;letter-spacing:0.05em;text-transform:uppercase;">UniVerse Instant Refund Launchpad</div>
            <h1 style="font-size:1.8rem;margin:0.25rem 0 0.5rem;color:#ffffff;">₹${amount}</h1>
            <div style="color:#94a3b8;font-size:0.85rem;">Order #${order.orderNumber} • ${studentName}</div>
            <div style="background:#0f172a;border-radius:10px;padding:0.4rem;margin-top:0.6rem;font-size:0.85rem;font-family:monospace;color:#60a5fa;">${upiId || 'No UPI Provided'}</div>
          </div>

          <a href="${gpayIntent}" class="btn-upi gpay">🚀 Pay via Google Pay</a>
          <a href="${phonepeIntent}" class="btn-upi phonepe">💜 Pay via PhonePe</a>
          <a href="${paytmIntent}" class="btn-upi paytm">💙 Pay via Paytm</a>
          <a href="${upiPayLink}" class="btn-upi generic">⚡ Open Default UPI App</a>

          <form action="/api/orders/refund/mobile-settle/${refund.id}" method="POST" style="margin-top:1.5rem;background:#0f172a;padding:1rem;border-radius:16px;">
            <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.4rem;">Bank UTR / Transaction ID (Required):</label>
            <input type="text" name="utr" required placeholder="e.g. 523489123456" style="width:100%;padding:0.75rem;border-radius:10px;background:#1e293b;border:1px solid #475569;color:white;font-size:0.95rem;margin-bottom:0.75rem;" />
            <button type="submit" style="width:100%;padding:0.85rem;border-radius:10px;background:#10b981;border:none;color:white;font-weight:800;cursor:pointer;font-size:0.95rem;">Mark Refund Settled & Close</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[orders.refund.claim-pay] Error:', err);
    res.status(500).send('Server Error');
  }
});

// ⚡ Mobile 1-Tap Settlement Endpoint (Called from Mobile Launchpad)
router.all('/refund/mobile-settle/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;
    const utr = ((req.body && req.body.utr) || req.query.utr || '').trim();

    if (!utr) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>UTR Required</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem 1rem; background: #0f172a; color: white;">
          <div style="background: #1e293b; padding: 2rem; border-radius: 24px; max-width: 420px; margin: 2rem auto; border: 1px solid #ef4444;">
            <div style="width: 55px; height: 55px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #f87171; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">⚠️</div>
            <h2 style="color: #ef4444; margin: 0 0 0.5rem 0;">Bank UTR Required</h2>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem;">The 12-digit Bank UTR or Transaction Reference number is strictly required to close this refund.</p>
            <button onclick="history.back()" style="padding: 0.8rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer;">Go Back & Enter UTR</button>
          </div>
        </body>
        </html>
      `);
    }

    const result = await refundService.settleRefund({
      refundId,
      utr,
      settledBy: 'WhatsApp Admin',
      io: req.app.get('io')
    });

    if (!result.success) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Refund Notice</title></head>
        <body style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem 1rem; background: #0f172a; color: white;">
          <div style="background: #1e293b; padding: 2rem; border-radius: 24px; max-width: 420px; margin: 2rem auto; border: 1px solid #334155;">
            <div style="width: 55px; height: 55px; border-radius: 50%; background: #451a03; color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">ℹ️</div>
            <h2 style="margin: 0 0 0.5rem 0;">${result.message}</h2>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 1rem;">This refund may have already been settled by another admin.</p>
            <a href="${process.env.FRONTEND_URL || 'https://uat.food.universeorder.co.in'}/super-admin/panel?tab=refunds" style="display:inline-block; margin-top: 1.5rem; background: #334155; color: white; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem;">Open Super Admin Portal</a>
          </div>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Refund Completed</title></head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem 1rem; background: #0f172a; color: white;">
        <div style="background: #1e293b; padding: 2rem; border-radius: 24px; max-width: 420px; margin: 2rem auto; border: 1px solid #334155;">
          <div style="width: 55px; height: 55px; border-radius: 50%; background: #064e3b; color: #34d399; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">✓</div>
          <h2 style="margin: 0 0 0.5rem 0;">Refund Settled!</h2>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem;">The student has been notified on WhatsApp and their live order tracker updated to completed.</p>
          <div style="background: #0f172a; padding: 1rem; border-radius: 14px; text-align: left; font-size: 0.85rem; margin-bottom: 1.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span>UTR Reference:</span><strong>${utr || 'Logged in DB'}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Status:</span><strong style="color:#34d399;">Processed & Closed</strong></div>
          </div>
          <p style="color: #64748b; font-size: 0.75rem;">You can safely close this browser window.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[orders.refund.mobile-settle] Error:', err);
    res.status(500).send(`
      <div style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem; color: #ef4444;">
        <h3>⚠️ Settlement Error</h3>
        <p>${err.message}</p>
      </div>
    `);
  }
});

module.exports = router;

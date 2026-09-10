const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const notificationService = require('../services/notificationService');
const journeyEngineService = require('../services/journeyEngineService');

const crypto = require('crypto');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Generate a cryptographically secure random token (hex string)
const generateSecureToken = () => crypto.randomBytes(16).toString('hex');

// Create a new Order (Public Customer endpoint)
// NOTE: For Razorpay checkouts, use the /api/payments/razorpay/verify endpoint
// which creates the order ONLY after successful payment to avoid DB clutter.
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = req.body;

    const store = await Store.findById(storeId).populate('admin');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Consistent logic: QR Scans have no timer (null deadline)
    // Pre-orders have 15 mins. Direct ASAP orders have 5 mins.
    let deadlineMinutes = isPreOrder ? 15 : (isQRScan ? null : 5);
    
    let acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod,
      customerPhone,
      customerName,
      orderType,
      packagingChargeApplied,
      status: 'Payment Pending',
      paymentStatus: 'Pending',
      acceptDeadline,
      isPreOrder: isPreOrder || false,
      scheduledTime: scheduledTime || null
    });

    const savedOrder = await newOrder.save();

    // Don't notify vendor yet - wait for payment confirmation via Razorpay verify endpoint
    console.log(`Order #${savedOrder.orderNumber} created, awaiting payment...`);

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's Orders (Protected, Store Specific)
router.get('/:storeId/vendor-orders', auth, async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Ensure user is either the store owner or an employee of this store
    if (store.admin.toString() !== req.admin._id && req.admin.storeId !== req.params.storeId) {
      return res.status(403).json({ message: 'Unauthorized access to store orders' });
    }

    const orders = await Order.find({ 
      store: store._id,
      status: { $ne: 'Payment Pending' }
    }).sort({ createdAt: -1 });
    res.json(orders);
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
    // Maps the Target Status to the Required Current Status(es)
    const validTransitions = {
      'Confirmed': ['Pending'],
      'Cooking': ['Confirmed'],
      'Ready': ['Cooking'],
      'Cancelled': ['Payment Pending', 'Pending'] 
    };

    if (status === 'Completed') {
      return res.status(400).json({ message: 'Orders can only be completed via secure QR Handover.' });
    }

    if (!validTransitions[status]) {
       return res.status(400).json({ message: 'Invalid or unsupported status transition requested.' });
    }

    const expectedCurrentStatuses = validTransitions[status];
    const authorizedStoreId = req.admin.storeId || req.admin._id;

    // PRE-ORDER STRICT TIME LOCK
    const existingOrderCheck = await Order.findById(req.params.id);
    if (!existingOrderCheck) return res.status(404).json({ message: 'Order not found' });
    
    if (existingOrderCheck.isPreOrder && existingOrderCheck.scheduledTime) {
      if (status === 'Cooking' || status === 'Ready') {
        const [hours, minutes] = existingOrderCheck.scheduledTime.split(':').map(Number);
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        if (diffMins > 20) {
          return res.status(403).json({ message: `Too early to prepare! Please wait until there is less than 20 minutes left. (Current: ${Math.round(diffMins)} mins left)` });
        }
      }
    }

    // 3. Atomic Conditional Update & Token Generation
    const updatePayload = { $set: { status: status } };
    
    // Generate handover token when transitioning to Ready.
    // Since strict validTransitions ensure we are ONLY coming from 'Cooking', we know it doesn't have a token yet.
    if (status === 'Ready') {
      updatePayload.$set.handoverToken = generateSecureToken();
      // Set expiry to 24 hours from generation
      updatePayload.$set.handoverTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // This entirely prevents Race Conditions if two cooks tap "Confirm" simultaneously
    const updatedOrder = await Order.findOneAndUpdate(
      { 
        _id: req.params.id, 
        store: authorizedStoreId, // Ensures order belongs to this store
        status: { $in: expectedCurrentStatuses } // Must currently be in expected state
      },
      updatePayload,
      { returnDocument: 'after' }
    ).populate('store').select('+handoverToken');

    if (!updatedOrder) {
      // If update failed, determine exactly why (Race condition vs Not Found vs Unauthorized)
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
      
      if (existingOrder.store.toString() !== authorizedStoreId.toString()) {
         return res.status(403).json({ message: 'Unauthorized: Order belongs to another store.' });
      }

      return res.status(409).json({ 
        message: `Order has already been processed or moved to ${existingOrder.status}. Transition to ${status} is invalid.`,
        currentStatus: existingOrder.status 
      });
    }

    const auditService = require('../services/auditService');
    const refundService = require('../services/refundService');

    // If order was cancelled / rejected by vendor, trigger direct UPI refund queue and team alert
    if (status === 'Cancelled') {
      const reason = req.body.reason || 'Kitchen closed or item out of stock';
      refundService.handleOrderCancellation({
        orderId: updatedOrder._id,
        reason,
        actorType: 'VENDOR_STAFF',
        actorId: req.admin?.name || 'VENDOR_STAFF',
        io: req.app.get('io')
      }).catch(err => console.error('[OrderUpdate] Cancellation refund error:', err.message));
    } else {
      // Log event in immutable audit trail
      let eventType = 'ORDER_ACCEPTED';
      if (status === 'Cooking') eventType = 'ORDER_COOKING';
      else if (status === 'Ready') eventType = 'ORDER_READY';

      auditService.logEvent({
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        userId: updatedOrder.userId,
        actorType: 'VENDOR_STAFF',
        actorId: req.admin?.name || 'VENDOR_STAFF',
        eventType,
        oldStatus: expectedCurrentStatuses[0] || 'Pending',
        newStatus: status,
        metadata: {
          storeName: updatedOrder.store?.name || 'Kitchen Counter',
          prepTime: status === 'Ready' ? new Date() : null
        }
      }).catch(err => console.error('[AuditService] Log event error:', err.message));
    }

    const io = req.app.get('io');
    // Notify customer
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
    // Notify store room
    io.to(updatedOrder.store._id.toString()).emit('order_status_update', updatedOrder);
    // Notify superadmin room for real-time 3D graphs
    io.to('superadmin_room').emit('superadmin:order_update', updatedOrder);

    // Trigger / Resume Lifecycle Journey Automation across all order status transitions
    if (updatedOrder.customerPhone) {
      const orderPayload = {
        userId: updatedOrder.userId || updatedOrder.customerPhone,
        name: updatedOrder.customerName || 'Student',
        phone: updatedOrder.customerPhone,
        metadata: {
          orderId: updatedOrder.orderNumber || updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber || '',
          storeName: updatedOrder.store?.name || 'Campus Food Court',
          amount: updatedOrder.totalAmount
        }
      };

      if (status === 'Cooking' || status === 'Confirmed') {
        journeyEngineService.resumeOrderJourney(updatedOrder._id, 'Order Accepted', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Accepted resume error:', e.message));
        journeyEngineService.triggerEvent('Order Accepted', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Accepted trigger error:', e.message));
      } else if (status === 'Ready') {
        journeyEngineService.resumeOrderJourney(updatedOrder._id, 'Order Ready', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Ready resume error:', e.message));
        journeyEngineService.triggerEvent('Order Ready', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Ready trigger error:', e.message));
      } else if (status === 'Cancelled') {
        journeyEngineService.resumeOrderJourney(updatedOrder._id, 'Order Rejected', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Rejected resume error:', e.message));
        journeyEngineService.triggerEvent('Order Cancelled', orderPayload)
          .catch(e => console.error('[JourneyEngine] Order Cancelled trigger error:', e.message));
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
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.status !== 'Payment Pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    const io = req.app.get('io');
    io.to(order.store.toString()).emit('order_cancelled', order);
    io.to('superadmin_room').emit('superadmin:order_cancelled', order);
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Order Status (Public, for customer tracking)
router.get('/:id', async (req, res) => {
  try {
    // We explicitly select +handoverToken here so the tracking page can generate the QR code
    // The tracking page ONLY displays the QR code if status === 'Ready'
    const order = await Order.findById(req.params.id).select('+handoverToken').populate({
      path: 'store',
      populate: { path: 'admin', select: 'name' }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Order Handover via QR (Protected)
router.put('/verify-handover', auth, async (req, res) => {
  try {
    const { orderId, handoverToken } = req.body;

    if (!orderId || !handoverToken) {
      return res.status(400).json({ message: 'Order ID and Handover Token are required' });
    }

    const authorizedStoreId = req.admin.storeId || req.admin._id;

    // ATOMIC VERIFICATION AND CONSUMPTION
    // Query requires the order to be exactly in the Ready state with an unused, matching token
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        store: authorizedStoreId,         // Verify store ownership
        status: 'Ready',                  // Must be currently READY
        handoverToken: handoverToken,     // Must precisely match the cryptographically secure token
        handoverTokenUsedAt: null,        // Must be entirely unused
        $or: [
          { handoverTokenExpiresAt: { $gt: new Date() } },
          { handoverTokenExpiresAt: null }
        ]
      },
      {
        $set: {
          status: 'Completed',
          handoverTokenUsedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    ).populate('store');

    if (!updatedOrder) {
      // Differentiate why it failed for better UX
      const existingOrder = await Order.findById(orderId).select('+handoverTokenUsedAt');
      if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
      
      if (existingOrder.store.toString() !== authorizedStoreId.toString()) {
        return res.status(403).json({ message: 'Unauthorized: Order belongs to another store' });
      }

      if (existingOrder.status === 'Completed' || existingOrder.handoverTokenUsedAt) {
        return res.status(409).json({ message: 'Order already handed over and completed.' });
      }

      if (existingOrder.status !== 'Ready') {
        return res.status(409).json({ message: `Cannot handover. Order is currently in ${existingOrder.status} state.` });
      }

      return res.status(400).json({ message: 'Invalid or expired handover token.' });
    }

    // Notify customer about status update
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
    
    // Also notify vendors in the store room so dashboards update
    io.to(updatedOrder.store._id.toString()).emit('order_status_update', updatedOrder);

    // Log ORDER_COMPLETED event in immutable audit trail
    const auditService = require('../services/auditService');
    auditService.logEvent({
      orderId: updatedOrder._id,
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

    // Trigger / Resume Lifecycle Journey Automation for verified QR handover
    if (updatedOrder.customerPhone) {
      const orderPayload = {
        userId: updatedOrder.userId || updatedOrder.customerPhone,
        name: updatedOrder.customerName || 'Student',
        phone: updatedOrder.customerPhone,
        metadata: {
          orderId: updatedOrder.orderNumber || updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber || '',
          storeName: updatedOrder.store?.name || 'Campus Food Court',
          amount: updatedOrder.totalAmount
        }
      };

      journeyEngineService.resumeOrderJourney(updatedOrder._id, 'Order Completed', orderPayload)
        .catch(e => console.error('[JourneyEngine] Handover resume error:', e.message));
      journeyEngineService.triggerEvent('Order Completed', orderPayload)
        .catch(e => console.error('[JourneyEngine] Handover trigger error:', e.message));
    }

    res.json({ success: true, message: 'Handover verified and order completed', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Quick Customer Lookup for Checkout Pre-fill (Safe, no sensitive data exposed)
router.get('/customer/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json({ exists: false });

    const cleanPhone = phone.toString().replace(/\D/g, '');
    const Customer = require('../models/Customer');
    const customer = await Customer.findOne({ 
      phone: { $regex: cleanPhone.slice(-10) } 
    }).select('currentName email campus -_id');

    if (!customer) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      currentName: customer.currentName,
      email: customer.email || ''
    });
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

    const refundService = require('../services/refundService');
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

    const Customer = require('../models/Customer');
    const customer = await Customer.findOne({ phone: { $regex: cleanPhone } });

    const orders = await Order.find({
      $or: [
        { customerPhone: { $regex: cleanPhone } },
        ...(customer?.userId ? [{ userId: customer.userId }] : [])
      ]
    })
    .populate('store', 'name market image isOpen')
    .sort({ createdAt: -1 })
    .limit(30);

    const activeOrders = orders.filter(o => ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status));
    const pastOrders = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status));

    res.json({
      orders: pastOrders,
      activeOrders,
      customer: customer ? {
        name: customer.currentName,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        favoriteItems: customer.favoriteItems || []
      } : null
    });
  } catch (err) {
    console.error('[orders.customer.history] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ⚡ 3-Minute Claim & Lock 1-Tap Mobile Payment Launchpad
router.get('/refund/claim-pay/:refundId', async (req, res) => {
  try {
    const { refundId } = req.params;
    const Refund = require('../models/Refund');
    const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');
    const RefundConfig = require('../models/RefundConfig');

    const refund = await Refund.findById(refundId).populate({
      path: 'orderId',
      populate: { path: 'store', select: 'name market' }
    });

    if (!refund) {
      return res.status(404).send(`
        <div style="font-family:system-ui;text-align:center;padding:3rem 1rem;">
          <h2>❌ Refund Record Not Found</h2>
          <p>This refund link is invalid or expired.</p>
        </div>
      `);
    }

    const order = refund.orderId || {};

    // 1. Check if already settled
    if (refund.status === 'PROCESSED' || order.refundStatus === 'Refunded') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Refund Already Settled</title></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem; background: #f8fafc; color: #1e293b;">
          <div style="background: white; padding: 2rem; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); max-width: 420px; margin: 2rem auto; border: 1px solid #e2e8f0;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">✓</div>
            <h2 style="color: #0f172a; margin: 0 0 0.5rem 0;">Already Settled!</h2>
            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0;">
              Refund for <strong>Order #${order.orderNumber}</strong> was already completed by <strong>${refund.settledBy || 'Super Admin'}</strong>.
            </p>
            <div style="background: #f1f5f9; padding: 1rem; border-radius: 14px; text-align: left; font-size: 0.85rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span>Amount:</span><strong>₹${(refund.amount || 0).toFixed(2)}</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span>To UPI:</span><strong>${refund.customerUpiId}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span>Bank UTR:</span><strong>${refund.utr || 'Logged in DB'}</strong></div>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // 2. Check if currently locked by another admin
    const now = new Date();
    if (refund.lockExpiresAt && refund.lockExpiresAt > now && refund.lockedBy) {
      const remainingSeconds = Math.round((refund.lockExpiresAt - now) / 1000);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Refund In Progress</title></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem; background: #fffbeb; color: #78350f;">
          <div style="background: white; padding: 2rem; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); max-width: 420px; margin: 2rem auto; border: 1.5px solid #fde68a;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 1rem;">🔒</div>
            <h2 style="color: #92400e; margin: 0 0 0.5rem 0;">Already Claimed!</h2>
            <p style="color: #78350f; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0;">
              <strong>${refund.lockedBy}</strong> is currently processing the refund for <strong>Order #${order.orderNumber}</strong>.
            </p>
            <div style="background: #fef3c7; padding: 0.85rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; color: #b45309;">
              ⚠️ Please DO NOT pay to avoid duplicate transfer.<br>
              <span style="font-size:0.75rem;font-weight:normal;opacity:0.85;">Lock releases in ${remainingSeconds}s if unpaid.</span>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // 3. Atomically Lock for 3 minutes
    const adminTag = req.query.admin || 'Team Member';
    refund.lockedBy = adminTag;
    refund.lockedAt = now;
    refund.lockExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 mins lock
    await refund.save();

    // 4. Notify WhatsApp Group of Lock
    try {
      const config = await RefundConfig.findOne();
      if (config?.notifyGroup && config?.groupJid) {
        whatsappMultiDeviceService.sendDirectMessage(
          config.groupJid,
          `🔒 *Refund Claimed:* ${adminTag} is processing ₹${refund.amount} for Order #${order.orderNumber}.`
        ).catch(() => {});
      }
    } catch (_) {}

    // 5. Build native UPI Intent URL
    const studentName = (refund.customerName || order.customerName || 'UniVerse Student').replace(/[^a-zA-Z0-9 ]/g, '');
    const amount = (refund.amount || order.totalAmount || 0).toFixed(2);
    const upiId = refund.customerUpiId || order.customerUpiId || '';
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=UniVerse_Refund_${order.orderNumber}&cu=INR`;

    // 6. Serve 1-Tap Launchpad (with auto redirect to PhonePe/GPay)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UniVerse Refund Launchpad</title>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.location.href = "${upiDeepLink}";
            }, 300);
          };
        </script>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 2rem 1rem; background: #09090b; color: #ffffff;">
        <div style="background: #18181b; padding: 2rem 1.5rem; border-radius: 24px; max-width: 420px; margin: 1.5rem auto; border: 1.5px solid #27272a; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div style="width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem;">⚡</div>
          <h2 style="margin: 0 0 0.25rem 0; font-size: 1.4rem; font-weight: 900;">UniVerse Refund Desk</h2>
          <p style="color: #a1a1aa; font-size: 0.85rem; margin: 0 0 1.5rem 0;">Opening your UPI app in 1 tap...</p>
          
          <div style="background: #27272a; padding: 1rem; border-radius: 16px; margin-bottom: 1.5rem; text-align: left; font-size: 0.9rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span style="color:#a1a1aa;">Order:</span><strong>#${order.orderNumber}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span style="color:#a1a1aa;">Recipient:</span><strong>${studentName}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;"><span style="color:#a1a1aa;">UPI ID:</span><strong style="color:#60a5fa;">${upiId}</strong></div>
            <div style="display:flex;justify-content:space-between;padding-top:0.6rem;border-top:1px solid #3f3f46;"><span style="color:#a1a1aa;">Refund Amount:</span><strong style="color:#34d399;font-size:1.2rem;">₹${amount}</strong></div>
          </div>

          <a href="${upiDeepLink}" style="display: block; padding: 1rem; border-radius: 14px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; font-weight: 800; font-size: 1rem; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); margin-bottom: 1rem;">
            🚀 Open GPay / PhonePe (₹${amount})
          </a>

          <p style="color: #71717a; font-size: 0.75rem; margin: 0;">
            🔒 Claimed for 3 minutes. Lock expires if unpaid.
          </p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[orders.refund.claim-pay] Error:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

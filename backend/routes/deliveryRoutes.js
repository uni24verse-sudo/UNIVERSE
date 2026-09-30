const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { normalizeOrder } = require('../utils/pgAdapter');
const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');

/**
 * 1. GET /api/delivery/staff/:storeId
 * Fetch delivery boys roster for a specific stall
 */
router.get('/staff/:storeId', auth, async (req, res) => {
  try {
    const { storeId } = req.params;
    const staff = await prisma.vendorDeliveryStaff.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 2. POST /api/delivery/staff/:storeId
 * Add a new delivery partner to the stall's roster
 */
router.post('/staff/:storeId', auth, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, phone, vehicleNo } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

    const created = await prisma.vendorDeliveryStaff.create({
      data: {
        id: crypto.randomUUID(),
        storeId,
        name: name.trim(),
        phone: cleanPhone,
        vehicleNo: (vehicleNo || '').trim(),
        isActive: true
      }
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 3. DELETE /api/delivery/staff/:storeId/:staffId
 * Deactivate a delivery partner from the stall roster
 */
router.delete('/staff/:storeId/:staffId', auth, async (req, res) => {
  try {
    const { storeId, staffId } = req.params;
    await prisma.vendorDeliveryStaff.updateMany({
      where: { id: staffId, storeId },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Delivery partner removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 4. POST /api/delivery/dispatch
 * Vendor dispatches one or multiple orders to a rider
 */
router.post('/dispatch', auth, async (req, res) => {
  try {
    const { orderIds, riderName, riderPhone, vehicleNo } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'At least one orderId is required' });
    }
    if (!riderName || !riderPhone) {
      return res.status(400).json({ message: 'Rider name and phone are required' });
    }

    const cleanPhone = String(riderPhone).replace(/\D/g, '').slice(-10);
    const batchId = orderIds.length > 1 ? `BATCH-${Date.now().toString(36).toUpperCase()}` : '';
    const dispatchedAt = new Date();

    const updatedOrders = [];

    for (let index = 0; index < orderIds.length; index++) {
      const orderId = orderIds[index];
      const currentOrder = await prisma.order.findUnique({
        where: { id: String(orderId) },
        include: { store: true }
      });

      if (!currentOrder) continue;

      // Ensure 4-digit PIN exists
      const deliveryOtp = currentOrder.deliveryOtp || Math.floor(1000 + Math.random() * 9000).toString();

      const updated = await prisma.order.update({
        where: { id: String(orderId) },
        data: {
          riderName: riderName.trim(),
          riderPhone: cleanPhone,
          deliveryBatchId: batchId || currentOrder.id,
          batchStopSequence: index + 1,
          dispatchedAt,
          status: 'Out for Delivery',
          deliveryOtp
        },
        include: { store: true }
      });

      const normalized = normalizeOrder(updated);
      updatedOrders.push(normalized);

      // Emit real-time socket events
      const io = req.app.get('io');
      if (io) {
        // Notify store room
        io.to(updated.storeId).emit('order_status_updated', normalized);
        // Notify user private room
        if (updated.userId) {
          io.to(`user_${updated.userId}`).emit('user_order_update', normalized);
        }
        // Superadmin global feed
        io.emit('superadmin_order_updated', normalized);
      }
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackingToken = batchId || orderIds[0];
    const dispatchLink = `${frontendBase}/deliver/${trackingToken}`;

    // Proactively send WhatsApp alert with magic link to the rider if WhatsApp service is connected
    try {
      const stopsSummary = updatedOrders.map((o, idx) => `Stop ${idx + 1}: ${o.deliveryAddress || 'Campus'} (${o.customerName})`).join('\n');
      const storeName = updatedOrders[0]?.store?.name || 'UniVerse Stall';
      const msg = `🛵 *New Delivery Trip Assigned!*\n🏪 Stall: *${storeName}*\n📦 Orders: ${updatedOrders.length}\n\n${stopsSummary}\n\n👉 *Open Navigation Cockpit:*\n${dispatchLink}\n\n_(Screen stays awake during navigation)_`;
      await whatsappMultiDeviceService.sendWhatsAppMessage(cleanPhone, msg);
    } catch (waErr) {
      console.log('[Delivery] Rider WhatsApp notification skipped/error:', waErr.message);
    }

    res.json({
      success: true,
      batchId,
      dispatchedCount: updatedOrders.length,
      dispatchLink,
      orders: updatedOrders
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 5. GET /api/delivery/cockpit/:tokenOrId
 * Public endpoint for the delivery boy's browser cockpit
 */
router.get('/cockpit/:tokenOrId', async (req, res) => {
  try {
    const { tokenOrId } = req.params;

    // Search by deliveryBatchId OR single order id
    let orders = await prisma.order.findMany({
      where: {
        OR: [
          { deliveryBatchId: tokenOrId },
          { id: tokenOrId }
        ]
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            market: true,
            storeType: true,
            location: true
          }
        }
      },
      orderBy: { batchStopSequence: 'asc' }
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'Delivery trip not found or expired' });
    }

    // Check expiration rule:
    // If all orders in trip are Completed, and the last delivery was > 30 minutes ago, expire link.
    const allCompleted = orders.every(o => o.status === 'Completed' || o.status === 'Cancelled');
    if (allCompleted) {
      const latestDelivery = orders.reduce((latest, o) => {
        const d = o.deliveredAt ? new Date(o.deliveredAt).getTime() : 0;
        return d > latest ? d : latest;
      }, 0);

      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (latestDelivery > 0 && latestDelivery < thirtyMinutesAgo) {
        return res.status(410).json({
          expired: true,
          message: 'This delivery trip has ended and expired.'
        });
      }
    }

    const sanitizedOrders = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: allCompleted ? '******' : o.customerPhone, // Mask phone once delivered
      deliveryAddress: o.deliveryAddress,
      items: o.items,
      totalAmount: o.totalAmount,
      status: o.status,
      batchStopSequence: o.batchStopSequence,
      dispatchedAt: o.dispatchedAt,
      deliveredAt: o.deliveredAt,
      cookingInstructions: o.cookingInstructions
    }));

    res.json({
      success: true,
      batchId: orders[0].deliveryBatchId || orders[0].id,
      store: orders[0].store,
      riderName: orders[0].riderName,
      riderPhone: orders[0].riderPhone,
      allCompleted,
      stops: sanitizedOrders
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 6. POST /api/delivery/verify-stop
 * Rider enters 4-digit PIN to verify customer handover
 */
router.post('/verify-stop', async (req, res) => {
  try {
    const { orderId, pin } = req.body;

    if (!orderId || !pin) {
      return res.status(400).json({ message: 'Order ID and 4-digit PIN are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { store: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'Completed') {
      return res.json({ success: true, message: 'Stop is already completed', alreadyCompleted: true });
    }

    const enteredPin = String(pin).trim();
    const actualPin = String(order.deliveryOtp || '').trim();

    if (enteredPin !== actualPin) {
      return res.status(400).json({ success: false, message: 'Invalid 4-digit PIN. Please ask customer for correct PIN.' });
    }

    const deliveredAt = new Date();
    const updated = await prisma.order.update({
      where: { id: String(orderId) },
      data: {
        status: 'Completed',
        deliveredAt
      },
      include: { store: true }
    });

    const normalized = normalizeOrder(updated);

    // Emit real-time completion event
    const io = req.app.get('io');
    if (io) {
      io.to(updated.storeId).emit('order_status_updated', normalized);
      if (updated.userId) {
        io.to(`user_${updated.userId}`).emit('user_order_update', normalized);
      }
      io.emit('superadmin_order_updated', normalized);
    }

    // Check remaining stops in trip
    const batchId = updated.deliveryBatchId || updated.id;
    const remainingOrders = await prisma.order.count({
      where: {
        deliveryBatchId: batchId,
        status: { notIn: ['Completed', 'Cancelled'] }
      }
    });

    res.json({
      success: true,
      message: 'Delivery verified successfully!',
      deliveredAt,
      allCompleted: remainingOrders === 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

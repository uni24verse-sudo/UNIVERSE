const crypto = require('crypto');
const OrderEvent = require('../models/OrderEvent');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

/**
 * Log an immutable order event in the audit trail
 */
const logEvent = async ({
  orderId,
  orderNumber,
  userId,
  actorType = 'SYSTEM',
  actorId = 'SYSTEM',
  eventType,
  oldStatus = '',
  newStatus = '',
  metadata = {}
}) => {
  try {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const event = await OrderEvent.create({
      eventId,
      orderId,
      orderNumber,
      userId,
      actorType,
      actorId,
      eventType,
      oldStatus,
      newStatus,
      metadata,
      createdAt: new Date()
    });

    // Asynchronously update customer aggregated metrics if userId exists
    if (userId) {
      recalculateCustomerMetrics(userId).catch(err => 
        console.error(`[auditService] Error updating metrics for ${userId}:`, err.message)
      );
    }

    return event;
  } catch (err) {
    console.error('[auditService.logEvent] Error logging event:', err.message);
    return null;
  }
};

/**
 * Get or create stable Customer record by phone
 */
const getOrCreateCustomer = async ({ phone, name = '', email = '', campus = 'Campus Food Court' }) => {
  if (!phone) return null;
  const cleanPhone = phone.trim();

  try {
    let customer = await Customer.findOne({ phone: cleanPhone });

    if (!customer) {
      const generatedUserId = `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      customer = await Customer.create({
        userId: generatedUserId,
        phone: cleanPhone,
        currentName: name || 'UniVerse Student',
        email: email ? email.trim().toLowerCase() : '',
        campus: campus || 'Campus Food Court',
        lastActivityAt: new Date()
      });
    } else {
      // Update last active timestamp
      customer.lastActivityAt = new Date();
      // If email was provided and was previously empty, attach it
      if (email && !customer.email) {
        customer.email = email.trim().toLowerCase();
      }
      await customer.save();
    }

    return customer;
  } catch (err) {
    console.error('[auditService.getOrCreateCustomer] Error:', err.message);
    return null;
  }
};

/**
 * Recalculate customer aggregated stats from historical orders
 */
const recalculateCustomerMetrics = async (userId) => {
  if (!userId) return;

  try {
    const orders = await Order.find({ userId });
    
    let totalOrders = orders.length;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let vendorRejectedOrders = 0;
    let totalSpent = 0;
    let totalRefunded = 0;

    for (const ord of orders) {
      if (ord.status === 'Completed') {
        completedOrders++;
        totalSpent += (ord.totalAmount || 0);
      } else if (ord.status === 'Cancelled') {
        cancelledOrders++;
        if (ord.cancelledBy?.actorType === 'VENDOR_STAFF' || ord.cancellationReason?.toLowerCase().includes('reject')) {
          vendorRejectedOrders++;
        }
        totalRefunded += (ord.refundAmount || ord.totalAmount || 0);
      }
    }

    const refundRate = totalOrders > 0 
      ? Math.round((totalRefunded / (totalSpent + totalRefunded || 1)) * 1000) / 10 
      : 0;

    const riskSignals = [];
    if (refundRate > 35 && totalOrders >= 3) {
      riskSignals.push({
        flagType: 'HIGH_REFUND_RATIO',
        reason: `Refund rate is ${refundRate}% across ${totalOrders} orders.`,
        detectedAt: new Date()
      });
    }

    await Customer.updateOne(
      { userId },
      {
        $set: {
          'metrics.totalOrders': totalOrders,
          'metrics.completedOrders': completedOrders,
          'metrics.cancelledOrders': cancelledOrders,
          'metrics.vendorRejectedOrders': vendorRejectedOrders,
          'metrics.totalSpent': totalSpent,
          'metrics.totalRefunded': totalRefunded,
          'metrics.refundRate': refundRate,
          riskSignals
        }
      }
    );
  } catch (err) {
    console.error('[auditService.recalculateCustomerMetrics] Error:', err.message);
  }
};

/**
 * Fetch chronological order timeline
 */
const getOrderTimeline = async (orderId) => {
  try {
    const events = await OrderEvent.find({ orderId }).sort({ createdAt: 1 });
    if (events && events.length > 0) {
      return events;
    }

    // Baseline Synthesis for historical records
    const order = await Order.findById(orderId).populate('store');
    if (!order) return [];

    const synthesized = [];
    const baseTime = new Date(order.createdAt || Date.now());

    // 1. Order Placement Event
    synthesized.push({
      eventId: `evt_init_${order._id}`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      actorType: 'CUSTOMER',
      actorId: order.customerPhone || 'STUDENT_APP',
      eventType: 'ORDER_PLACED',
      newStatus: 'Pending',
      createdAt: baseTime,
      metadata: {
        amount: order.totalAmount,
        storeName: order.store?.name || 'Campus Counter',
        orderType: order.orderType
      }
    });

    // 2. Payment Captured Event
    if (order.paymentStatus === 'Confirmed' || order.transactionId) {
      synthesized.push({
        eventId: `evt_pay_${order._id}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        actorType: 'RAZORPAY_GATEWAY',
        actorId: 'RAZORPAY_API',
        eventType: 'PAYMENT_CAPTURED',
        newStatus: 'Confirmed',
        createdAt: new Date(baseTime.getTime() + 15000),
        metadata: {
          amount: order.totalAmount,
          paymentId: order.transactionId || 'pay_legacy',
          method: order.paymentMethod || 'Razorpay'
        }
      });
    }

    // 3. Final Lifecycle State
    if (order.status === 'Completed') {
      synthesized.push({
        eventId: `evt_done_${order._id}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        actorType: 'VENDOR_STAFF',
        actorId: 'QR_SCANNER',
        eventType: 'ORDER_COMPLETED',
        newStatus: 'Completed',
        createdAt: new Date(order.updatedAt || baseTime.getTime() + 300000),
        metadata: {
          handoverMode: 'QR_CODE_SCAN',
          storeName: order.store?.name || 'Campus Counter'
        }
      });
    } else if (order.status === 'Cancelled') {
      synthesized.push({
        eventId: `evt_cancel_${order._id}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        actorType: 'SYSTEM',
        actorId: 'AUTO_REFUND_ENGINE',
        eventType: 'REFUND_PROCESSED',
        newStatus: 'Cancelled',
        createdAt: new Date(order.updatedAt || baseTime.getTime() + 180000),
        metadata: {
          refundId: order.refundId || `rfnd_auto_${order.transactionId || order._id}`,
          amount: order.refundAmount || order.totalAmount,
          reason: order.cancellationReason || 'Kitchen unavailable / rejected'
        }
      });
    }

    return synthesized;
  } catch (err) {
    console.error('[auditService.getOrderTimeline] Error:', err.message);
    return [];
  }
};

module.exports = {
  logEvent,
  getOrCreateCustomer,
  recalculateCustomerMetrics,
  getOrderTimeline
};

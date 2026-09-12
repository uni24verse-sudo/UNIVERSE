const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Log an immutable order event in the audit trail (PostgreSQL)
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
    const event = await prisma.orderEvent.create({
      data: {
        id: eventId,
        eventId,
        orderId,
        orderNumber: orderNumber || '',
        userId: userId || '',
        actorType,
        actorId,
        eventType,
        oldStatus,
        newStatus,
        metadata: metadata || {},
        createdAt: new Date()
      }
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
 * Get or create stable Customer record by phone (PostgreSQL)
 */
const getOrCreateCustomer = async ({ phone, name = '', email = '', campus = 'Campus Food Court' }) => {
  if (!phone) return null;
  const cleanPhone = phone.trim();

  try {
    let customer = await prisma.customer.findFirst({
      where: { phone: cleanPhone }
    });

    if (!customer) {
      const generatedUserId = `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      customer = await prisma.customer.create({
        data: {
          id: generatedUserId,
          userId: generatedUserId,
          phone: cleanPhone,
          currentName: name || 'UniVerse Student',
          email: email ? email.trim().toLowerCase() : '',
          campus: campus || 'Campus Food Court',
          lastActivityAt: new Date(),
          metrics: {
            totalOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            vendorRejectedOrders: 0,
            totalSpent: 0,
            totalRefunded: 0,
            refundRate: 0
          },
          riskSignals: []
        }
      });
    } else {
      // Update last active timestamp and email if previously empty
      const updateData = { lastActivityAt: new Date() };
      if (email && !customer.email) {
        updateData.email = email.trim().toLowerCase();
      }
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: updateData
      });
    }

    return customer;
  } catch (err) {
    console.error('[auditService.getOrCreateCustomer] Error:', err.message);
    return null;
  }
};

/**
 * Recalculate customer aggregated stats from historical orders (PostgreSQL)
 */
const recalculateCustomerMetrics = async (userId) => {
  if (!userId) return;

  try {
    const orders = await prisma.order.findMany({
      where: { userId }
    });
    
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

    await prisma.customer.updateMany({
      where: { userId },
      data: {
        metrics: {
          totalOrders,
          completedOrders,
          cancelledOrders,
          vendorRejectedOrders,
          totalSpent,
          totalRefunded,
          refundRate
        },
        riskSignals
      }
    });
  } catch (err) {
    console.error('[auditService.recalculateCustomerMetrics] Error:', err.message);
  }
};

/**
 * Fetch chronological order timeline (PostgreSQL)
 */
const getOrderTimeline = async (orderId) => {
  try {
    const events = await prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });
    if (events && events.length > 0) {
      return events;
    }

    // Baseline Synthesis for historical records
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true }
    });
    if (!order) return [];

    const synthesized = [];
    const baseTime = new Date(order.createdAt || Date.now());

    // 1. Order Placement Event
    synthesized.push({
      id: `evt_init_${order.id}`,
      eventId: `evt_init_${order.id}`,
      orderId: order.id,
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
        id: `evt_pay_${order.id}`,
        eventId: `evt_pay_${order.id}`,
        orderId: order.id,
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
        id: `evt_done_${order.id}`,
        eventId: `evt_done_${order.id}`,
        orderId: order.id,
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
        id: `evt_cancel_${order.id}`,
        eventId: `evt_cancel_${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        actorType: 'SYSTEM',
        actorId: 'AUTO_REFUND_ENGINE',
        eventType: 'REFUND_PROCESSED',
        newStatus: 'Cancelled',
        createdAt: new Date(order.updatedAt || baseTime.getTime() + 180000),
        metadata: {
          refundId: order.refundId || `rfnd_auto_${order.transactionId || order.id}`,
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

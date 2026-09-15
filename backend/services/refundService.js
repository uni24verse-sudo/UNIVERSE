const crypto = require('crypto');
const prisma = require('../config/prisma');
const auditService = require('./auditService');
const journeyEngineService = require('./journeyEngineService');
const whatsappMultiDeviceService = require('./whatsappMultiDeviceService');
const { normalizeOrder, normalizeRefund } = require('../utils/pgAdapter');

/**
 * ⚡ STREAMLINED DIRECT UPI INSTANT REFUND SERVICE (PostgreSQL Native)
 * Bypasses Razorpay 2-3 hour bank clearing delays completely.
 * Direct P2P/P2M transfers to students with instant 1-tap deep links & WhatsApp group alerts.
 */

/**
 * 1. Handle Order Cancellation (Called on Vendor Rejection or Acceptance Timeout)
 */
const handleOrderCancellation = async ({
  orderId,
  reason = 'Item out of stock or kitchen closed',
  actorType = 'VENDOR_STAFF',
  actorId = 'VENDOR_APP',
  io = null
}) => {
  try {
    const rawOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      },
      include: { store: true }
    });

    if (!rawOrder) {
      return { success: false, message: 'Order not found' };
    }

    // If already refunded, avoid duplicate processing
    if (rawOrder.refundStatus === 'Refunded' || rawOrder.refundStatus === 'Processed') {
      return { 
        success: true, 
        message: 'Order was already refunded', 
        refundId: rawOrder.refundId 
      };
    }

    const idempotencyKey = `rfnd_${rawOrder.id}_${Date.now()}`;
    const refundTrackingId = `rfnd_upi_${crypto.randomBytes(4).toString('hex')}`;
    const oldStatus = rawOrder.status;

    const targetUpi = rawOrder.customerUpiId || rawOrder.payerUpiId || '';

    // Update Order State to Cancelled and Refund Requested
    const updatedRawOrder = await prisma.order.update({
      where: { id: rawOrder.id },
      data: {
        status: 'Cancelled',
        refundStatus: 'Requested',
        refundAmount: rawOrder.totalAmount,
        refundId: refundTrackingId,
        refundIdempotencyKey: idempotencyKey,
        cancellationReason: reason,
        cancelledBy: { actorType, actorId },
        customerUpiId: targetUpi || null
      },
      include: { store: true }
    });

    // Create or update Refund record
    let rawRefund = await prisma.refund.findFirst({
      where: { orderId: rawOrder.id }
    });

    if (!rawRefund) {
      rawRefund = await prisma.refund.create({
        data: {
          id: rawOrder.id,
          refundId: refundTrackingId,
          paymentId: rawOrder.transactionId || 'OFFLINE_PAYMENT',
          orderId: rawOrder.id,
          userId: rawOrder.userId || 'GUEST',
          customerName: rawOrder.customerName || 'Student',
          customerPhone: rawOrder.customerPhone || '',
          customerUpiId: targetUpi,
          amount: rawOrder.totalAmount,
          idempotencyKey,
          reason,
          status: 'REQUESTED',
          mode: 'DIRECT_UPI',
          whatsappNotified: true,
          createdAt: new Date()
        }
      });
    } else {
      rawRefund = await prisma.refund.update({
        where: { id: rawRefund.id },
        data: {
          status: 'REQUESTED',
          mode: 'DIRECT_UPI',
          amount: rawOrder.totalAmount,
          reason,
          customerUpiId: targetUpi || rawRefund.customerUpiId
        }
      });
    }

    const order = normalizeOrder(updatedRawOrder);
    const refund = normalizeRefund(rawRefund);

    // Log immutable audit event
    await auditService.logEvent({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      actorType,
      actorId,
      eventType: actorType === 'VENDOR_STAFF' ? 'VENDOR_REJECTED' : 'ORDER_CANCELLED',
      oldStatus,
      newStatus: 'Cancelled',
      metadata: {
        refundId: refundTrackingId,
        refundAmount: order.totalAmount,
        reason,
        storeName: order.store?.name || 'Food Court Counter'
      }
    });

    // 📱 Dispatch WhatsApp Cancellation Notice to Student via Journey Engine
    const studentPhone = order.customerPhone;
    const storeName = order.store?.name || 'Kitchen Counter';

    if (journeyEngineService && studentPhone) {
      const payload = {
        userId: order.userId || studentPhone,
        name: order.customerName || 'Student',
        phone: studentPhone,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          storeName,
          amount: order.totalAmount,
          customerUpi: targetUpi,
          reason
        }
      };

      journeyEngineService.resumeOrderJourney(order._id, 'Order Rejected', payload)
        .then(async (resumedCount) => {
          if (!resumedCount) {
            await journeyEngineService.triggerEvent('Order Cancelled', payload);
          }
        })
        .catch(err => console.error('[refundService] Journey cancellation dispatch error:', err.message));
    }

    // 🌐 Real-time Socket Broadcasts on Cancellation
    if (io) {
      io.to(order._id.toString()).emit('order_status_update', order);
      if (order.orderNumber) {
        io.to(order.orderNumber.toString()).emit('order_status_update', order);
      }
      if (order.storeId) {
        io.to(order.storeId.toString()).emit('order_status_update', order);
      }
      io.to('superadmin_room').emit('superadmin:order_update', order);
    }

    return {
      success: true,
      refundId: refundTrackingId,
      amount: order.totalAmount,
      refundStatus: 'Requested',
      message: 'Order cancelled, direct UPI refund queued, and customer notified.'
    };
  } catch (err) {
    console.error('[refundService.handleOrderCancellation] Critical Error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * 2. Request / Confirm UPI Refund (Submitted by Student on OrderTracker.jsx)
 */
const requestUpiRefund = async ({ orderId, upiId, io = null }) => {
  try {
    if (!upiId || typeof upiId !== 'string') {
      return { success: false, message: 'Valid UPI ID is required.' };
    }

    const cleanUpi = upiId.trim().toLowerCase();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(cleanUpi)) {
      return { success: false, message: 'Invalid UPI ID format. Example: name@okhdfcbank or 9876543210@paytm' };
    }

    const rawOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }]
      },
      include: { store: true }
    });

    if (!rawOrder) {
      return { success: false, message: 'Order not found.' };
    }

    if (rawOrder.status !== 'Cancelled') {
      return { success: false, message: 'Refund can only be requested for cancelled orders.' };
    }

    if (rawOrder.refundStatus === 'Refunded' || rawOrder.refundStatus === 'Processed') {
      return { success: false, message: 'This order has already been refunded.' };
    }

    // Update order with UPI ID
    const updatedRawOrder = await prisma.order.update({
      where: { id: rawOrder.id },
      data: {
        customerUpiId: cleanUpi,
        refundStatus: 'Requested'
      },
      include: { store: true }
    });

    // Update or create Refund record
    let rawRefund = await prisma.refund.findFirst({
      where: { orderId: rawOrder.id }
    });

    if (!rawRefund) {
      rawRefund = await prisma.refund.create({
        data: {
          id: rawOrder.id,
          refundId: `rfnd_upi_${crypto.randomBytes(4).toString('hex')}`,
          paymentId: rawOrder.transactionId || 'OFFLINE_PAYMENT',
          orderId: rawOrder.id,
          userId: rawOrder.userId || 'GUEST',
          customerName: rawOrder.customerName || 'Student',
          customerPhone: rawOrder.customerPhone || '',
          customerUpiId: cleanUpi,
          amount: rawOrder.totalAmount,
          reason: rawOrder.cancellationReason || 'Student requested refund',
          status: 'REQUESTED',
          mode: 'DIRECT_UPI',
          whatsappNotified: true,
          createdAt: new Date()
        }
      });
    } else {
      rawRefund = await prisma.refund.update({
        where: { id: rawRefund.id },
        data: {
          customerUpiId: cleanUpi,
          status: 'REQUESTED',
          mode: 'DIRECT_UPI'
        }
      });
    }

    const order = normalizeOrder(updatedRawOrder);
    const refund = normalizeRefund(rawRefund);

    // 📱 Student WhatsApp Acknowledgment
    const ackMessage = 
      `⚡ *UniVerse Refund Request Confirmed!*\n\n` +
      `📋 *Order:* #${order.orderNumber}\n` +
      `💰 *Amount:* ₹${order.totalAmount.toFixed(2)}\n` +
      `💳 *Target UPI ID:* \`${cleanUpi}\`\n\n` +
      `Our admin team has received your request and is transferring your money directly via UPI.\n` +
      `_Turnaround: Usually 2–5 minutes._\n\n` +
      `You will receive another message with reference details once sent! ❤️`;

    if (order.customerPhone) {
      whatsappMultiDeviceService.sendDirectMessage(order.customerPhone, ackMessage).catch(err => {
        console.error('[refundService] Student ack dispatch error:', err.message);
      });
    }

    // 🚨 Dispatch Priority WhatsApp Alert to Team Group & Admin Phone(s)
    whatsappMultiDeviceService.sendRefundAlertToTeam({ order, refund }).catch(err => {
      console.error('[refundService] Team alert dispatch error:', err.message);
    });

    // 🌐 Real-time Socket Broadcasts
    if (io) {
      io.to(order._id.toString()).emit('order_status_update', order);
      if (order.orderNumber) {
        io.to(order.orderNumber.toString()).emit('order_status_update', order);
      }
      io.to('superadmin_room').emit('new_refund_request', {
        refundId: refund._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerUpiId: cleanUpi,
        amount: order.totalAmount,
        storeName: order.store?.name || 'Counter',
        createdAt: refund.createdAt
      });
    }

    return {
      success: true,
      message: 'Refund request received successfully. Admin team notified.',
      customerUpiId: cleanUpi,
      refundStatus: 'Requested'
    };
  } catch (err) {
    console.error('[refundService.requestUpiRefund] Error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * 3. Settle Refund (Triggered by Super Admin after paying via GPay/PhonePe)
 */
const settleRefund = async ({ refundId, utr = '', settledBy = 'Super Admin', io = null }) => {
  try {
    const rawRefund = await prisma.refund.findFirst({
      where: {
        OR: [{ id: refundId }, { refundId: refundId }]
      },
      include: {
        order: {
          include: { store: true }
        }
      }
    });

    if (!rawRefund) {
      return { success: false, message: 'Refund record not found.' };
    }

    const rawOrder = rawRefund.order;
    if (!rawOrder) {
      return { success: false, message: 'Associated order not found.' };
    }

    const cleanUtr = (utr || '').trim();
    const now = new Date();

    // Mark Refund as PROCESSED
    const updatedRawRefund = await prisma.refund.update({
      where: { id: rawRefund.id },
      data: {
        status: 'PROCESSED',
        utr: cleanUtr,
        settledBy,
        settledAt: now,
        processedAt: now
      }
    });

    // Update Order state
    const updatedRawOrder = await prisma.order.update({
      where: { id: rawOrder.id },
      data: {
        refundStatus: 'Refunded',
        refundUtr: cleanUtr,
        refundSettledAt: now
      },
      include: { store: true }
    });

    const refund = normalizeRefund(updatedRawRefund);
    const order = normalizeOrder(updatedRawOrder);

    // Log Immutable Audit Event
    await auditService.logEvent({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      actorType: 'SUPER_ADMIN',
      actorId: settledBy,
      eventType: 'REFUND_PROCESSED',
      oldStatus: 'Cancelled (Requested)',
      newStatus: 'Cancelled (Refunded)',
      metadata: {
        refundId: refund.refundId,
        refundAmount: order.totalAmount,
        customerUpiId: refund.customerUpiId,
        utr: cleanUtr,
        settledBy
      }
    });

    // 📱 Dispatch WhatsApp Confirmation to Student via Journey Engine
    const studentPhone = order.customerPhone;
    if (journeyEngineService && studentPhone) {
      const payload = {
        userId: order.userId || studentPhone,
        name: order.customerName || 'Student',
        phone: studentPhone,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          storeName: order.store?.name || 'Kitchen',
          amount: order.totalAmount,
          customerUpi: refund.customerUpiId || order.customerUpiId || 'UPI',
          utr: cleanUtr
        }
      };

      journeyEngineService.triggerEvent('Refund Settled', payload)
        .catch(err => console.error('[refundService] Journey refund settled dispatch error:', err.message));
    }

    // 📢 Post notice in WhatsApp Team Group so other admins know it is done
    whatsappMultiDeviceService.sendRefundSettlementNoticeToTeam({ order, refund, settledBy }).catch(err => {
      console.error('[refundService] Team settlement notice error:', err.message);
    });

    // 🌐 Real-time Socket Updates
    if (io) {
      io.to(order._id.toString()).emit('order_status_update', order);
      if (order.orderNumber) {
        io.to(order.orderNumber.toString()).emit('order_status_update', order);
      }
      io.to('superadmin_room').emit('refund_settled', {
        refundId: refund._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        utr: cleanUtr,
        settledBy
      });
    }

    return {
      success: true,
      message: `Refund of ₹${order.totalAmount} marked as settled successfully.`,
      refund,
      order
    };
  } catch (err) {
    console.error('[refundService.settleRefund] Error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * 4. Update UTR on a previously settled refund
 */
const updateRefundUtr = async ({ refundId, utr, updatedBy = 'Super Admin' }) => {
  try {
    const cleanUtr = (utr || '').trim();
    const refund = await prisma.refund.findFirst({
      where: {
        OR: [{ id: refundId }, { refundId: refundId }]
      }
    });
    if (!refund) return { success: false, message: 'Refund not found.' };

    await prisma.refund.update({
      where: { id: refund.id },
      data: { utr: cleanUtr }
    });

    if (refund.orderId) {
      await prisma.order.update({
        where: { id: refund.orderId },
        data: { refundUtr: cleanUtr }
      });
    }

    return { success: true, message: 'UTR updated successfully.', utr: cleanUtr };
  } catch (err) {
    console.error('[refundService.updateRefundUtr] Error:', err);
    return { success: false, message: err.message };
  }
};

// Backward-compatibility alias
const processAutomatedRefund = handleOrderCancellation;

module.exports = {
  handleOrderCancellation,
  processAutomatedRefund,
  requestUpiRefund,
  settleRefund,
  updateRefundUtr
};

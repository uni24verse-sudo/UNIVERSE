const crypto = require('crypto');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Refund = require('../models/Refund');
const auditService = require('./auditService');
const journeyEngineService = require('./journeyEngineService');
const whatsappMultiDeviceService = require('./whatsappMultiDeviceService');

/**
 * ⚡ STREAMLINED DIRECT UPI INSTANT REFUND SERVICE
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
    const order = await Order.findById(orderId).populate('store');
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    // If already refunded, avoid duplicate processing
    if (order.refundStatus === 'Refunded' || order.refundStatus === 'Processed') {
      return { 
        success: true, 
        message: 'Order was already refunded', 
        refundId: order.refundId 
      };
    }

    const idempotencyKey = `rfnd_${order._id}_${Date.now()}`;
    const refundTrackingId = `rfnd_upi_${crypto.randomBytes(4).toString('hex')}`;
    const oldStatus = order.status;

    // Update Order State to Cancelled and Refund Requested
    order.status = 'Cancelled';
    order.refundStatus = 'Requested';
    order.refundAmount = order.totalAmount;
    order.refundId = refundTrackingId;
    order.refundIdempotencyKey = idempotencyKey;
    order.cancellationReason = reason;
    order.cancelledBy = { actorType, actorId };

    // Default student UPI if payer VPA was captured during checkout
    if (!order.customerUpiId && order.payerUpiId) {
      order.customerUpiId = order.payerUpiId;
    }
    await order.save();

    // Create or update Refund Ledger record
    let refundRecord = await Refund.findOne({ orderId: order._id });
    if (!refundRecord) {
      refundRecord = await Refund.create({
        refundId: refundTrackingId,
        paymentId: order.transactionId || 'OFFLINE_PAYMENT',
        orderId: order._id,
        userId: order.userId || 'GUEST',
        customerName: order.customerName || 'Student',
        customerPhone: order.customerPhone || '',
        customerUpiId: order.customerUpiId || order.payerUpiId || '',
        amount: order.totalAmount,
        idempotencyKey,
        reason,
        status: 'REQUESTED',
        mode: 'DIRECT_UPI',
        whatsappNotified: true
      });
    } else {
      refundRecord.status = 'REQUESTED';
      refundRecord.mode = 'DIRECT_UPI';
      refundRecord.amount = order.totalAmount;
      refundRecord.reason = reason;
      if (!refundRecord.customerUpiId && order.customerUpiId) {
        refundRecord.customerUpiId = order.customerUpiId;
      }
      await refundRecord.save();
    }

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

    // 📱 Dispatch WhatsApp Cancellation Notice to Student
    const studentPhone = order.customerPhone;
    const storeName = order.store?.name || 'the kitchen';
    const targetUpi = order.customerUpiId || order.payerUpiId;

    const studentCancelMessage = 
      `*UNIVERSE Order Update* ⚠️\n\n` +
      `We're sorry, *${storeName}* could not accept your order *#${order.orderNumber}* (${reason}).\n\n` +
      `💰 *Refund Amount:* ₹${order.totalAmount.toFixed(2)}\n` +
      `⚡ *Status:* Queued for Instant Direct UPI Transfer\n\n` +
      (targetUpi 
        ? `We have your UPI ID: *${targetUpi}* on file.\n` 
        : `Please confirm your UPI ID on the live order tracker so we can send your money.\n`) +
      `🔗 *Live Refund Tracker:*\nhttps://www.universeorder.co.in/order-tracker/${order._id}\n\n` +
      `_UniVerse Student Support_`;

    if (studentPhone) {
      whatsappMultiDeviceService.sendDirectMessage(studentPhone, studentCancelMessage).catch(err => {
        console.error('[refundService] Student WhatsApp dispatch error:', err.message);
      });
    }

    // 🚨 If student UPI is already known (e.g. from payer UPI), notify Super Admin Team immediately!
    if (targetUpi) {
      whatsappMultiDeviceService.sendRefundAlertToTeam({ order, refund: refundRecord }).catch(err => {
        console.error('[refundService] Team alert error:', err.message);
      });
    }

    // Trigger Journey Lifecycle event
    if (journeyEngineService) {
      journeyEngineService.triggerEvent('Order Cancelled', {
        phone: studentPhone,
        name: order.customerName || 'Student',
        orderId: order.orderNumber,
        storeName,
        amount: order.totalAmount
      }).catch(err => console.error('[refundService] Journey alert error:', err.message));
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

    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId) && orderId.toString().length === 24;
    const query = isObjectId ? { $or: [{ _id: orderId }, { orderNumber: orderId }] } : { orderNumber: orderId };

    const order = await Order.findOne(query).populate('store');
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (order.status !== 'Cancelled') {
      return { success: false, message: 'Refund can only be requested for cancelled orders.' };
    }

    if (order.refundStatus === 'Refunded' || order.refundStatus === 'Processed') {
      return { success: false, message: 'This order has already been refunded.' };
    }

    // Update order with UPI ID
    order.customerUpiId = cleanUpi;
    order.refundStatus = 'Requested';
    await order.save();

    // Update or create Refund record
    let refund = await Refund.findOne({ orderId: order._id });
    if (!refund) {
      refund = await Refund.create({
        refundId: `rfnd_upi_${crypto.randomBytes(4).toString('hex')}`,
        paymentId: order.transactionId || 'OFFLINE_PAYMENT',
        orderId: order._id,
        userId: order.userId || 'GUEST',
        customerName: order.customerName || 'Student',
        customerPhone: order.customerPhone || '',
        customerUpiId: cleanUpi,
        amount: order.totalAmount,
        reason: order.cancellationReason || 'Student requested refund',
        status: 'REQUESTED',
        mode: 'DIRECT_UPI',
        whatsappNotified: true
      });
    } else {
      refund.customerUpiId = cleanUpi;
      refund.status = 'REQUESTED';
      refund.mode = 'DIRECT_UPI';
      await refund.save();
    }

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
      // Notify student's tracker room
      io.to(order._id.toString()).emit('order_status_update', order);
      if (order.orderNumber) {
        io.to(order.orderNumber.toString()).emit('order_status_update', order);
      }
      // Notify SuperAdmin command center
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
    const refund = await Refund.findById(refundId).populate({
      path: 'orderId',
      populate: { path: 'store' }
    });

    if (!refund) {
      return { success: false, message: 'Refund record not found.' };
    }

    const order = refund.orderId;
    if (!order) {
      return { success: false, message: 'Associated order not found.' };
    }

    const cleanUtr = (utr || '').trim();
    const now = new Date();

    // Mark Refund as PROCESSED
    refund.status = 'PROCESSED';
    refund.utr = cleanUtr;
    refund.settledBy = settledBy;
    refund.settledAt = now;
    refund.processedAt = now;
    await refund.save();

    // Update Order state
    order.refundStatus = 'Refunded';
    order.refundUtr = cleanUtr;
    order.refundSettledAt = now;
    await order.save();

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

    // 📱 Dispatch WhatsApp Confirmation to Student
    const studentPhone = order.customerPhone;
    const utrSection = cleanUtr ? `📌 *Bank Ref / UTR:* \`${cleanUtr}\`\n` : '';
    const studentSuccessMessage =
      `🎉 *REFUND CREDITED SUCCESSFULLY!* 💸\n\n` +
      `📋 *Order:* #${order.orderNumber} (${order.store?.name || 'Kitchen'})\n` +
      `💰 *Amount:* ₹${order.totalAmount.toFixed(2)}\n` +
      `💳 *Transferred to UPI:* \`${refund.customerUpiId || order.customerUpiId || 'Your UPI'}\`\n` +
      utrSection +
      `\nThe refund has been transferred directly into your bank account.\n` +
      `We sincerely apologize for the inconvenience and hope to serve you again soon! ❤️\n\n` +
      `_UniVerse Campus Dining_`;

    if (studentPhone) {
      whatsappMultiDeviceService.sendDirectMessage(studentPhone, studentSuccessMessage).catch(err => {
        console.error('[refundService] Student confirmation error:', err.message);
      });
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
    const refund = await Refund.findById(refundId);
    if (!refund) return { success: false, message: 'Refund not found.' };

    refund.utr = cleanUtr;
    await refund.save();

    const order = await Order.findById(refund.orderId);
    if (order) {
      order.refundUtr = cleanUtr;
      await order.save();
    }

    return { success: true, message: 'UTR updated successfully.', utr: cleanUtr };
  } catch (err) {
    console.error('[refundService.updateRefundUtr] Error:', err);
    return { success: false, message: err.message };
  }
};

// Backward-compatibility alias so any existing caller functions smoothly
const processAutomatedRefund = handleOrderCancellation;

module.exports = {
  handleOrderCancellation,
  processAutomatedRefund,
  requestUpiRefund,
  settleRefund,
  updateRefundUtr
};

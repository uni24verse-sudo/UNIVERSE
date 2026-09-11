const prisma = require('../config/prisma');

/**
 * High-performance, fail-safe synchronization service to AWS RDS PostgreSQL
 * Ensures zero data loss between active runtime operations and PostgreSQL storage.
 */

async function syncStore(store) {
  if (!store || !store._id) return;
  try {
    const id = String(store._id);
    await prisma.store.upsert({
      where: { id },
      update: {
        adminId: String(store.admin || store.adminId),
        name: store.name,
        category: store.category || 'General',
        market: store.market || 'BH1 Market',
        locationId: store.locationId ? String(store.locationId) : null,
        image: store.image || '',
        qrLink: store.qrLink || '',
        isOpen: store.isOpen !== undefined ? Boolean(store.isOpen) : true,
        openingTime: store.openingTime || '10:00',
        closingTime: store.closingTime || '22:00',
        isAutomated: store.isAutomated !== undefined ? Boolean(store.isAutomated) : true,
        isHidden: Boolean(store.isHidden),
        packagingCharge: Number(store.packagingCharge) || 0,
        priority: Number(store.priority) || 0,
        commissionRate: Number(store.commissionRate) || 5,
        upiId: store.upiId || '',
        telegramChatId: store.telegramChatId || '',
        telegramBotToken: store.telegramBotToken || '',
        categoryImages: store.categoryImages || [],
        accentColor: store.accentColor || '#ef4123',
        storeType: store.storeType || 'FastFood',
        products: store.products || [],
        updatedAt: new Date()
      },
      create: {
        id,
        adminId: String(store.admin || store.adminId),
        name: store.name,
        category: store.category || 'General',
        market: store.market || 'BH1 Market',
        locationId: store.locationId ? String(store.locationId) : null,
        image: store.image || '',
        qrLink: store.qrLink || '',
        isOpen: store.isOpen !== undefined ? Boolean(store.isOpen) : true,
        openingTime: store.openingTime || '10:00',
        closingTime: store.closingTime || '22:00',
        isAutomated: store.isAutomated !== undefined ? Boolean(store.isAutomated) : true,
        isHidden: Boolean(store.isHidden),
        packagingCharge: Number(store.packagingCharge) || 0,
        priority: Number(store.priority) || 0,
        commissionRate: Number(store.commissionRate) || 5,
        upiId: store.upiId || '',
        telegramChatId: store.telegramChatId || '',
        telegramBotToken: store.telegramBotToken || '',
        categoryImages: store.categoryImages || [],
        accentColor: store.accentColor || '#ef4123',
        storeType: store.storeType || 'FastFood',
        products: store.products || []
      }
    });
  } catch (err) {
    console.error('[pgSyncService.syncStore] Error:', err.message);
  }
}

async function syncOrder(order) {
  if (!order || !order._id) return;
  try {
    const id = String(order._id);
    const storeId = String(order.store?._id || order.store || order.storeId);
    await prisma.order.upsert({
      where: { id },
      update: {
        storeId,
        orderNumber: order.orderNumber || '',
        userId: order.userId || '',
        customerName: order.customerName || 'UniVerse Student',
        customerPhone: order.customerPhone || '',
        customerEmail: order.customerEmail || '',
        items: order.items || [],
        totalAmount: Number(order.totalAmount) || 0,
        status: order.status || 'Pending',
        paymentMethod: order.paymentMethod || 'UPI',
        paymentStatus: order.paymentStatus || 'Pending',
        orderType: order.orderType || 'Dine In',
        packagingChargeApplied: Number(order.packagingChargeApplied) || 0,
        transactionId: order.transactionId || '',
        paymentProvider: order.paymentProvider || 'Razorpay',
        razorpayOrderId: order.razorpayOrderId || '',
        razorpayPaymentId: order.razorpayPaymentId || '',
        handoverToken: order.handoverToken || '',
        pickupQrCode: order.pickupQrCode || '',
        timeEstimateMinutes: Number(order.timeEstimateMinutes) || 15,
        refundId: order.refundId || '',
        refundAmount: Number(order.refundAmount) || 0,
        refundStatus: order.refundStatus || 'None',
        payerUpiId: order.payerUpiId || '',
        customerUpiId: order.customerUpiId || '',
        refundUtr: order.refundUtr || '',
        refundSettledAt: order.refundSettledAt ? new Date(order.refundSettledAt) : null,
        refundIdempotencyKey: order.refundIdempotencyKey || '',
        cancellationReason: order.cancellationReason || '',
        cancelledBy: order.cancelledBy || {},
        settlementId: order.settlementId || '',
        isSettled: Boolean(order.isSettled),
        isPreOrder: Boolean(order.isPreOrder),
        scheduledTime: order.scheduledTime || '',
        updatedAt: new Date()
      },
      create: {
        id,
        storeId,
        orderNumber: order.orderNumber || '',
        userId: order.userId || '',
        customerName: order.customerName || 'UniVerse Student',
        customerPhone: order.customerPhone || '',
        customerEmail: order.customerEmail || '',
        items: order.items || [],
        totalAmount: Number(order.totalAmount) || 0,
        status: order.status || 'Pending',
        paymentMethod: order.paymentMethod || 'UPI',
        paymentStatus: order.paymentStatus || 'Pending',
        orderType: order.orderType || 'Dine In',
        packagingChargeApplied: Number(order.packagingChargeApplied) || 0,
        transactionId: order.transactionId || '',
        paymentProvider: order.paymentProvider || 'Razorpay',
        razorpayOrderId: order.razorpayOrderId || '',
        razorpayPaymentId: order.razorpayPaymentId || '',
        handoverToken: order.handoverToken || '',
        pickupQrCode: order.pickupQrCode || '',
        timeEstimateMinutes: Number(order.timeEstimateMinutes) || 15,
        refundId: order.refundId || '',
        refundAmount: Number(order.refundAmount) || 0,
        refundStatus: order.refundStatus || 'None',
        payerUpiId: order.payerUpiId || '',
        customerUpiId: order.customerUpiId || '',
        refundUtr: order.refundUtr || '',
        refundSettledAt: order.refundSettledAt ? new Date(order.refundSettledAt) : null,
        refundIdempotencyKey: order.refundIdempotencyKey || '',
        cancellationReason: order.cancellationReason || '',
        cancelledBy: order.cancelledBy || {},
        settlementId: order.settlementId || '',
        isSettled: Boolean(order.isSettled),
        isPreOrder: Boolean(order.isPreOrder),
        scheduledTime: order.scheduledTime || ''
      }
    });
  } catch (err) {
    console.error('[pgSyncService.syncOrder] Error:', err.message);
  }
}

async function syncPayment(payment) {
  if (!payment || !payment._id) return;
  try {
    const id = String(payment._id);
    const paymentId = payment.paymentId || id;
    await prisma.payment.upsert({
      where: { paymentId },
      update: {
        orderId: String(payment.orderId || ''),
        userId: payment.userId || '',
        amount: Number(payment.amount) || 0,
        currency: payment.currency || 'INR',
        status: payment.status || 'CAPTURED',
        method: payment.method || 'Razorpay',
        fee: Number(payment.fee) || 0,
        tax: Number(payment.tax) || 0,
        capturedAt: payment.capturedAt ? new Date(payment.capturedAt) : new Date(),
        updatedAt: new Date()
      },
      create: {
        id,
        paymentId,
        orderId: String(payment.orderId || ''),
        userId: payment.userId || '',
        amount: Number(payment.amount) || 0,
        currency: payment.currency || 'INR',
        status: payment.status || 'CAPTURED',
        method: payment.method || 'Razorpay',
        fee: Number(payment.fee) || 0,
        tax: Number(payment.tax) || 0,
        capturedAt: payment.capturedAt ? new Date(payment.capturedAt) : new Date()
      }
    });
  } catch (err) {
    console.error('[pgSyncService.syncPayment] Error:', err.message);
  }
}

async function syncRefund(refund) {
  if (!refund || !refund._id) return;
  try {
    const id = String(refund._id);
    await prisma.refund.upsert({
      where: { id },
      update: {
        orderId: String(refund.orderId),
        paymentId: refund.paymentId || '',
        refundId: refund.refundId || '',
        userId: refund.userId || '',
        amount: Number(refund.amount) || 0,
        customerUpiId: refund.customerUpiId || '',
        customerName: refund.customerName || '',
        customerPhone: refund.customerPhone || '',
        reason: refund.reason || 'Order Cancelled',
        mode: refund.mode || 'DIRECT_UPI',
        status: refund.status || 'PENDING',
        utr: refund.utr || '',
        settledBy: refund.settledBy || '',
        settledAt: refund.settledAt ? new Date(refund.settledAt) : null,
        lockedBy: refund.lockedBy || '',
        lockedAt: refund.lockedAt ? new Date(refund.lockedAt) : null,
        lockExpiresAt: refund.lockExpiresAt ? new Date(refund.lockExpiresAt) : null,
        idempotencyKey: refund.idempotencyKey || '',
        whatsappNotified: Boolean(refund.whatsappNotified),
        rawResponse: refund.rawResponse || {},
        processedAt: refund.processedAt ? new Date(refund.processedAt) : null,
        updatedAt: new Date()
      },
      create: {
        id,
        orderId: String(refund.orderId),
        paymentId: refund.paymentId || '',
        refundId: refund.refundId || '',
        userId: refund.userId || '',
        amount: Number(refund.amount) || 0,
        customerUpiId: refund.customerUpiId || '',
        customerName: refund.customerName || '',
        customerPhone: refund.customerPhone || '',
        reason: refund.reason || 'Order Cancelled',
        mode: refund.mode || 'DIRECT_UPI',
        status: refund.status || 'PENDING',
        utr: refund.utr || '',
        settledBy: refund.settledBy || '',
        settledAt: refund.settledAt ? new Date(refund.settledAt) : null,
        lockedBy: refund.lockedBy || '',
        lockedAt: refund.lockedAt ? new Date(refund.lockedAt) : null,
        lockExpiresAt: refund.lockExpiresAt ? new Date(refund.lockExpiresAt) : null,
        idempotencyKey: refund.idempotencyKey || '',
        whatsappNotified: Boolean(refund.whatsappNotified),
        rawResponse: refund.rawResponse || {},
        processedAt: refund.processedAt ? new Date(refund.processedAt) : null
      }
    });
  } catch (err) {
    console.error('[pgSyncService.syncRefund] Error:', err.message);
  }
}

async function syncCustomer(customer) {
  if (!customer || !customer.userId) return;
  try {
    const id = String(customer._id || customer.id);
    await prisma.customer.upsert({
      where: { userId: customer.userId },
      update: {
        phone: customer.phone,
        email: customer.email || '',
        currentName: customer.currentName || 'UniVerse Student',
        campus: customer.campus || 'Lovely Professional University',
        status: customer.status || 'Active',
        metrics: customer.metrics || {},
        riskSignals: customer.riskSignals || [],
        lastActivityAt: customer.lastActivityAt ? new Date(customer.lastActivityAt) : new Date(),
        updatedAt: new Date()
      },
      create: {
        id,
        userId: customer.userId,
        phone: customer.phone,
        email: customer.email || '',
        currentName: customer.currentName || 'UniVerse Student',
        campus: customer.campus || 'Lovely Professional University',
        status: customer.status || 'Active',
        metrics: customer.metrics || {},
        riskSignals: customer.riskSignals || [],
        lastActivityAt: customer.lastActivityAt ? new Date(customer.lastActivityAt) : new Date()
      }
    });
  } catch (err) {
    console.error('[pgSyncService.syncCustomer] Error:', err.message);
  }
}

module.exports = {
  syncStore,
  syncOrder,
  syncPayment,
  syncRefund,
  syncCustomer
};

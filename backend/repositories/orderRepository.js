const prisma = require('../config/prisma');
const { normalizeOrder } = require('../utils/pgAdapter');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function generateOrderNumber() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateSecureToken() {
  return crypto.randomBytes(16).toString('hex');
}

class OrderRepository {
  async createOrder(data) {
    const id = data.id || data._id || generateId();
    const orderNumber = data.orderNumber || generateOrderNumber();
    const handoverToken = data.handoverToken || generateSecureToken();

    const created = await prisma.order.create({
      data: {
        id,
        storeId: data.storeId || data.store,
        orderNumber,
        userId: data.userId || '',
        customerName: data.customerName || 'UniVerse Student',
        customerPhone: data.customerPhone || '',
        customerEmail: data.customerEmail || '',
        items: data.items || [],
        totalAmount: Number(data.totalAmount) || 0,
        status: data.status || 'Pending',
        paymentMethod: data.paymentMethod || 'UPI',
        paymentStatus: data.paymentStatus || 'Pending',
        orderType: data.orderType || 'Dine In',
        packagingChargeApplied: Number(data.packagingChargeApplied) || 0,
        transactionId: data.transactionId || '',
        paymentProvider: data.paymentProvider || 'Razorpay',
        razorpayOrderId: data.razorpayOrderId || '',
        razorpayPaymentId: data.razorpayPaymentId || '',
        handoverToken,
        pickupQrCode: data.pickupQrCode || '',
        timeEstimateMinutes: Number(data.timeEstimateMinutes) || 15,
        isPreOrder: Boolean(data.isPreOrder),
        scheduledTime: data.scheduledTime || '',
        cancellationReason: data.cancellationReason || '',
        cancelledBy: data.cancelledBy || {}
      },
      include: {
        store: true
      }
    });

    return normalizeOrder(created);
  }

  async getOrderById(id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: {
          include: {
            admin: { select: { id: true, name: true, email: true, telegramChatId: true } }
          }
        },
        refunds: true
      }
    });
    return normalizeOrder(order);
  }

  async getOrderByToken(token) {
    const order = await prisma.order.findFirst({
      where: { handoverToken: token },
      include: {
        store: true
      }
    });
    return normalizeOrder(order);
  }

  async getVendorOrders(storeId) {
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        status: { not: 'Payment Pending' }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return orders.map(normalizeOrder);
  }

  async getCustomerOrders(phone) {
    const orders = await prisma.order.findMany({
      where: {
        customerPhone: phone
      },
      include: {
        store: {
          select: { id: true, name: true, image: true, market: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return orders.map(normalizeOrder);
  }

  async updateOrderStatus(id, status, extraFields = {}) {
    const data = { status, ...extraFields };
    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        store: true
      }
    });
    return normalizeOrder(updated);
  }

  async recordOrderEvent(eventData) {
    const eventId = eventData.eventId || `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return await prisma.orderEvent.create({
      data: {
        id: generateId(),
        eventId,
        orderId: eventData.orderId,
        orderNumber: eventData.orderNumber || '',
        userId: eventData.userId || '',
        actorType: eventData.actorType || 'SYSTEM',
        actorId: eventData.actorId || 'SYSTEM',
        eventType: eventData.eventType || 'STATUS_UPDATE',
        oldStatus: eventData.oldStatus || '',
        newStatus: eventData.newStatus || '',
        metadata: eventData.metadata || {}
      }
    });
  }
}

module.exports = new OrderRepository();

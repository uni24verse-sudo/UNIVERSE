const prisma = require('../config/prisma');
const { normalizeCustomer, normalizeOrder } = require('../utils/pgAdapter');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class CustomerRepository {
  async findByPhone(phone) {
    if (!phone) return null;
    const clean = phone.toString().replace(/\D/g, '').slice(-10);
    if (!clean) return null;

    const customer = await prisma.customer.findFirst({
      where: {
        phone: {
          contains: clean
        }
      }
    });
    return normalizeCustomer(customer);
  }

  async findByUserId(userId) {
    if (!userId) return null;
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });
    return normalizeCustomer(customer);
  }

  async upsertCustomer({ phone, name = '', email = '', campus = 'Campus Food Court' }) {
    if (!phone) return null;
    const cleanPhone = phone.trim();
    const existing = await this.findByPhone(cleanPhone);

    if (existing) {
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          currentName: name || existing.currentName,
          email: email ? email.trim().toLowerCase() : existing.email,
          campus: campus || existing.campus,
          lastActivityAt: new Date()
        }
      });
      return normalizeCustomer(updated);
    }

    const generatedUserId = `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const created = await prisma.customer.create({
      data: {
        id: generateId(),
        userId: generatedUserId,
        phone: cleanPhone,
        currentName: name || 'UniVerse Student',
        email: email ? email.trim().toLowerCase() : '',
        campus: campus || 'Campus Food Court',
        lastActivityAt: new Date()
      }
    });
    return normalizeCustomer(created);
  }

  async getCustomerOrderHistory(phone) {
    if (!phone) return { pastOrders: [], activeOrders: [], customer: null };
    const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) return { pastOrders: [], activeOrders: [], customer: null };

    const customer = await this.findByPhone(cleanPhone);

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerPhone: { contains: cleanPhone } },
          ...(customer?.userId ? [{ userId: customer.userId }] : [])
        ]
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            market: true,
            image: true,
            isOpen: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30
    });

    const normalizedOrders = orders.map(normalizeOrder);
    const activeOrders = normalizedOrders.filter(o =>
      ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)
    );
    const pastOrders = normalizedOrders.filter(o =>
      ['Completed', 'Cancelled'].includes(o.status)
    );

    return {
      orders: pastOrders,
      activeOrders,
      customer: customer ? {
        name: customer.currentName,
        phone: customer.phone,
        totalOrders: customer.metrics?.totalOrders || 0,
        favoriteItems: []
      } : null
    };
  }
}

module.exports = new CustomerRepository();

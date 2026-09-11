const prisma = require('../config/prisma');
const { normalizeAdmin } = require('../utils/pgAdapter');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class AdminRepository {
  async findByEmail(email) {
    if (!email) return null;
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        stores: true
      }
    });
    return normalizeAdmin(admin);
  }

  async findById(id) {
    if (!id) return null;
    const admin = await prisma.admin.findUnique({
      where: { id },
      include: {
        stores: true
      }
    });
    return normalizeAdmin(admin);
  }

  async createAdmin(data) {
    const id = data.id || data._id || generateId();
    const created = await prisma.admin.create({
      data: {
        id,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: data.role || 'vendor',
        telegramChatId: data.telegramChatId || '',
        isBanned: Boolean(data.isBanned)
      }
    });
    return normalizeAdmin(created);
  }

  async updateAdmin(id, updateData) {
    const updated = await prisma.admin.update({
      where: { id },
      data: updateData
    });
    return normalizeAdmin(updated);
  }

  async getAllVendors() {
    const admins = await prisma.admin.findMany({
      where: { role: 'vendor' },
      include: {
        stores: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return admins.map(normalizeAdmin);
  }
}

module.exports = new AdminRepository();

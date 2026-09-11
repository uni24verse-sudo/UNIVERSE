const prisma = require('../config/prisma');
const { normalizeSettlement } = require('../utils/pgAdapter');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class SettlementRepository {
  async getStoreSettlements(storeId) {
    const settlements = await prisma.settlement.findMany({
      where: { storeId },
      include: {
        store: true,
        admin: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return settlements.map(normalizeSettlement);
  }

  async getAllSettlements() {
    const settlements = await prisma.settlement.findMany({
      include: {
        store: true,
        admin: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return settlements.map(normalizeSettlement);
  }

  async createSettlement(data) {
    const id = data.id || data._id || generateId();
    const created = await prisma.settlement.create({
      data: {
        id,
        storeId: data.storeId || data.store,
        adminId: data.adminId || data.admin || null,
        settlementType: data.settlementType || 'daily',
        month: data.month ? Number(data.month) : 1,
        year: data.year ? Number(data.year) : 2026,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        totalOrders: Number(data.totalOrders) || 0,
        totalRevenue: Number(data.totalRevenue) || 0,
        grossSales: Number(data.grossSales || data.totalRevenue) || 0,
        gatewayFee: Number(data.gatewayFee) || 0,
        platformCommission: Number(data.platformCommission) || 0,
        cancellationPenalties: Number(data.cancellationPenalties) || 0,
        feesBreakdown: data.feesBreakdown || {},
        netPayable: Number(data.netPayable) || 0,
        status: data.status || 'pending',
        utr: data.utr || data.utrNumber || '',
        utrNumber: data.utrNumber || data.utr || '',
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
        processedAt: data.processedAt ? new Date(data.processedAt) : null
      },
      include: {
        store: true,
        admin: true
      }
    });
    return normalizeSettlement(created);
  }

  async updateSettlement(id, updateData) {
    const updated = await prisma.settlement.update({
      where: { id },
      data: updateData,
      include: {
        store: true,
        admin: true
      }
    });
    return normalizeSettlement(updated);
  }
}

module.exports = new SettlementRepository();

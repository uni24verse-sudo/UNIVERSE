const prisma = require('../config/prisma');
const { normalizeStore } = require('../utils/pgAdapter');
const crypto = require('crypto');

// Generate standard 24-hex unique string ID for new records
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class StoreRepository {
  async getAllStores({ locationId } = {}) {
    const where = {
      isHidden: false
    };
    if (locationId) {
      where.locationId = locationId;
    }

    const stores = await prisma.store.findMany({
      where,
      include: {
        admin: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true, type: true, city: true, dietaryType: true, markets: true } }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Fetch all order metrics in ONE single groupBy query across all stores
    const orderStats = await prisma.order.groupBy({
      by: ['storeId', 'status'],
      where: {
        status: { in: ['Completed', 'Cancelled'] }
      },
      _count: { id: true }
    });

    const completedMap = {};
    const cancelledMap = {};
    for (const stat of orderStats) {
      if (stat.status === 'Completed') {
        completedMap[stat.storeId] = stat._count.id;
      } else if (stat.status === 'Cancelled') {
        cancelledMap[stat.storeId] = stat._count.id;
      }
    }

    // Compute live ratings based on completed / cancelled orders
    const storesWithRatings = stores.map((s) => {
      const completedOrdersCount = completedMap[s.id] || 0;
      const cancelledOrdersCount = cancelledMap[s.id] || 0;

      let rating = 5.0;
      const totalRatedOrders = completedOrdersCount + cancelledOrdersCount;
      if (totalRatedOrders > 0) {
        rating = 1.0 + 4.0 * (completedOrdersCount / totalRatedOrders);
      }

      return {
        ...normalizeStore(s),
        rating: parseFloat(rating.toFixed(1)),
        completedOrdersCount,
        cancelledOrdersCount
      };
    });

    // Sort by performance: completed orders > cancelled orders > open status > rating
    storesWithRatings.sort((a, b) => {
      if (b.completedOrdersCount !== a.completedOrdersCount) {
        return b.completedOrdersCount - a.completedOrdersCount;
      }
      if (a.cancelledOrdersCount !== b.cancelledOrdersCount) {
        return a.cancelledOrdersCount - b.cancelledOrdersCount;
      }
      const aOpen = a.isOpen !== false;
      const bOpen = b.isOpen !== false;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (a.priority || 0) - (b.priority || 0);
    });

    return storesWithRatings;
  }

  async getStoreById(id) {
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: id },
          { id: { startsWith: id } }
        ]
      },
      include: {
        admin: { select: { id: true, name: true, email: true, telegramChatId: true } },
        location: { select: { id: true, name: true, type: true, city: true, dietaryType: true, markets: true } }
      }
    });

    if (!store || store.isHidden) return null;

    const normalized = normalizeStore(store);
    normalized.paymentStatus = {
      upiId: store.upiId || ''
    };
    return normalized;
  }

  async getVendorStores(adminId) {
    const stores = await prisma.store.findMany({
      where: { adminId },
      include: {
        location: { select: { id: true, name: true, type: true, city: true, dietaryType: true, markets: true } }
      }
    });

    const storesWithBilling = await Promise.all(stores.map(async (store) => {
      const completedOrders = await prisma.order.findMany({
        where: { storeId: store.id, status: 'Completed' },
        select: { totalAmount: true }
      });
      const revenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      let estimatedFees = 0;
      if (store.isTrialStarted && store.trialEndDate && new Date() > new Date(store.trialEndDate)) {
        estimatedFees = revenue * (store.commissionRate ? store.commissionRate / 100 : 0.035);
      }

      const daysLeftInTrial = store.isTrialStarted && store.trialEndDate ?
        Math.max(0, Math.ceil((new Date(store.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

      return {
        ...normalizeStore(store),
        totalRevenue: revenue,
        estimatedFees: estimatedFees.toFixed(2),
        daysLeftInTrial
      };
    }));

    return storesWithBilling;
  }

  async createStore(data) {
    const id = data.id || data._id || generateId();
    const created = await prisma.store.create({
      data: {
        id,
        adminId: data.adminId || data.admin,
        name: data.name,
        category: data.category || 'General',
        market: data.market || 'BH1 Market',
        locationId: data.locationId || null,
        upiId: data.upiId || '',
        telegramChatId: data.telegramChatId || '',
        products: []
      }
    });
    return normalizeStore(created);
  }

  async updateStoreDetails(storeId, adminId, details) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const data = {};
    if (details.name) data.name = details.name;
    if (details.category) data.category = details.category;
    if (details.packagingCharge !== undefined) data.packagingCharge = Number(details.packagingCharge);
    if (details.market) data.market = details.market;
    if (details.locationId !== undefined) data.locationId = details.locationId || null;
    if (details.upiId !== undefined) data.upiId = details.upiId;
    if (details.telegramChatId !== undefined) data.telegramChatId = details.telegramChatId;
    if (details.telegramBotToken !== undefined) data.telegramBotToken = details.telegramBotToken;
    if (details.openingTime) data.openingTime = details.openingTime;
    if (details.closingTime) data.closingTime = details.closingTime;
    if (details.isAutomated !== undefined) data.isAutomated = Boolean(details.isAutomated);
    if (details.autoAcceptOrders !== undefined) data.autoAcceptOrders = Boolean(details.autoAcceptOrders);
    if (details.accentColor !== undefined) data.accentColor = details.accentColor;
    if (details.image) data.image = details.image;
    if (details.isOpen !== undefined) data.isOpen = Boolean(details.isOpen);

    const updated = await prisma.store.update({
      where: { id: storeId },
      data,
      include: {
        admin: true,
        location: true
      }
    });
    return normalizeStore(updated);
  }

  async toggleStatus(storeId, adminId) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: {
        isOpen: !store.isOpen,
        isAutomated: false
      }
    });
    return normalizeStore(updated);
  }

  async toggleAutoAccept(storeId, adminId) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: {
        autoAcceptOrders: !store.autoAcceptOrders
      }
    });
    return normalizeStore(updated);
  }

  async addProduct(storeId, adminId, productData) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const products = Array.isArray(store.products) ? [...store.products] : [];
    const newProduct = {
      _id: generateId(),
      name: productData.name,
      description: productData.description || '',
      price: Number(productData.price) || 0,
      category: productData.category || 'Uncategorized',
      image: productData.image || '',
      dietaryPreference: productData.dietaryPreference || 'none',
      variants: productData.variants || [],
      isCombo: Boolean(productData.isCombo),
      comboItems: productData.comboItems || [],
      freeItems: productData.freeItems || [],
      isAvailable: productData.isAvailable !== false
    };

    products.push(newProduct);

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { products }
    });
    return normalizeStore(updated);
  }

  async addProductsBatch(storeId, adminId, productsList) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const currentProducts = Array.isArray(store.products) ? [...store.products] : [];
    const newItems = productsList.map(item => ({
      _id: generateId(),
      name: item.name,
      description: item.description || '',
      price: Number(item.price) || 0,
      category: item.category || 'Uncategorized',
      image: item.image || '',
      dietaryPreference: item.dietaryPreference || 'none',
      variants: item.variants || [],
      isCombo: Boolean(item.isCombo),
      comboItems: item.comboItems || [],
      freeItems: item.freeItems || [],
      isAvailable: item.isAvailable !== false
    }));

    const updatedProducts = [...currentProducts, ...newItems];

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { products: updatedProducts }
    });
    return normalizeStore(updated);
  }

  async updateProduct(storeId, adminId, productId, productData) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const products = Array.isArray(store.products) ? [...store.products] : [];
    const idx = products.findIndex(p => p._id === productId || p.id === productId);
    if (idx === -1) return null;

    const target = products[idx];
    if (productData.name) target.name = productData.name;
    if (productData.description !== undefined) target.description = productData.description;
    if (productData.price !== undefined) target.price = Number(productData.price);
    if (productData.category) target.category = productData.category;
    if (productData.dietaryPreference) target.dietaryPreference = productData.dietaryPreference;
    if (productData.variants) target.variants = productData.variants;
    if (productData.isCombo !== undefined) target.isCombo = Boolean(productData.isCombo);
    if (productData.comboItems) target.comboItems = productData.comboItems;
    if (productData.freeItems) target.freeItems = productData.freeItems;
    if (productData.image !== undefined) target.image = productData.image;

    products[idx] = target;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { products }
    });
    return normalizeStore(updated);
  }

  async toggleProduct(storeId, adminId, productId) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const products = Array.isArray(store.products) ? [...store.products] : [];
    const idx = products.findIndex(p => p._id === productId || p.id === productId);
    if (idx === -1) return null;

    const currentAvailability = products[idx].isAvailable !== false;
    products[idx].isAvailable = !currentAvailability;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { products }
    });
    return {
      store: normalizeStore(updated),
      product: products[idx],
      isAvailable: products[idx].isAvailable
    };
  }

  async deleteProduct(storeId, adminId, productId) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const products = (Array.isArray(store.products) ? store.products : []).filter(
      p => p._id !== productId && p.id !== productId
    );

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { products }
    });
    return normalizeStore(updated);
  }

  async updateCategoryImage(storeId, adminId, categoryName, imageUrl) {
    const store = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!store) return null;

    const categoryImages = Array.isArray(store.categoryImages) ? [...store.categoryImages] : [];
    const existingIdx = categoryImages.findIndex(c => c.categoryName === categoryName);
    if (existingIdx !== -1) {
      categoryImages[existingIdx].image = imageUrl;
    } else {
      categoryImages.push({ categoryName, image: imageUrl });
    }

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { categoryImages }
    });
    return normalizeStore(updated);
  }

  async toggleStatus(storeId, adminId) {
    const where = { id: storeId };
    if (adminId) {
      const admin = await prisma.admin.findUnique({ where: { id: adminId } });
      if (admin && admin.role !== 'superadmin') {
        where.adminId = adminId;
      }
    }

    const store = await prisma.store.findFirst({ where });
    if (!store) return null;

    const newIsOpen = !store.isOpen;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: {
        isOpen: newIsOpen,
        isAutomated: false
      },
      include: {
        admin: true,
        location: true
      }
    });

    return normalizeStore(updated);
  }

  async toggleHidden(storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return null;

    const newIsHidden = !store.isHidden;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { isHidden: newIsHidden },
      include: { admin: true, location: true }
    });

    return normalizeStore(updated);
  }

  async updateStoreDetails(storeId, adminId, details) {
    const where = { id: storeId };
    if (adminId) {
      const admin = await prisma.admin.findUnique({ where: { id: adminId } });
      if (admin && admin.role !== 'superadmin') {
        where.adminId = adminId;
      }
    }

    const store = await prisma.store.findFirst({ where });
    if (!store) return null;

    const updateData = {};
    if (details.name !== undefined) updateData.name = details.name;
    if (details.category !== undefined) updateData.category = details.category;
    if (details.market !== undefined) updateData.market = details.market;
    if (details.locationId !== undefined) updateData.locationId = details.locationId || null;
    if (details.openingTime !== undefined) updateData.openingTime = details.openingTime;
    if (details.closingTime !== undefined) updateData.closingTime = details.closingTime;
    if (details.isAutomated !== undefined) updateData.isAutomated = Boolean(details.isAutomated);
    if (details.isOpen !== undefined) updateData.isOpen = Boolean(details.isOpen);
    if (details.isHidden !== undefined) updateData.isHidden = Boolean(details.isHidden);
    if (details.packagingCharge !== undefined) updateData.packagingCharge = Number(details.packagingCharge) || 0;
    if (details.priority !== undefined) updateData.priority = Number(details.priority) || 0;
    if (details.commissionRate !== undefined) updateData.commissionRate = Number(details.commissionRate) || 5;
    if (details.upiId !== undefined) updateData.upiId = details.upiId;
    if (details.telegramChatId !== undefined) updateData.telegramChatId = details.telegramChatId;
    if (details.telegramBotToken !== undefined) updateData.telegramBotToken = details.telegramBotToken;
    if (details.accentColor !== undefined) updateData.accentColor = details.accentColor;
    if (details.storeType !== undefined) updateData.storeType = details.storeType;

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
      include: {
        admin: true,
        location: true
      }
    });

    return normalizeStore(updated);
  }
}

module.exports = new StoreRepository();

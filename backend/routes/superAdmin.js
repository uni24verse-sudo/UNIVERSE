const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const { normalizeOrder, normalizeStore, normalizeRefund, normalizeSettlement } = require('../utils/pgAdapter');
const storeRepository = require('../repositories/storeRepository');
const telegramService = require('../services/telegramService');
const refundService = require('../services/refundService');
const whatsappMultiDeviceService = require('../services/whatsappMultiDeviceService');

// Public route for landing portal to fetch locations
router.get('/locations/public', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
    res.json(locations.map(l => ({ ...l, _id: l.id })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply super admin authentication middleware to all routes in this file
router.use(superAdminAuth);

// 1. Get Platform Stats
router.get('/stats', async (req, res) => {
  try {
    const [totalVendors, totalStores, totalOrders, completedOrders] = await Promise.all([
      prisma.admin.count({ where: { role: 'vendor' } }),
      prisma.store.count(),
      prisma.order.count(),
      prisma.order.findMany({ where: { status: 'Completed' } })
    ]);

    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletedOrders = completedOrders.filter(order => new Date(order.createdAt) >= today);
    const todayRevenue = todayCompletedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const activeOrders = await prisma.order.count({
      where: { status: { in: ['Pending', 'Confirmed', 'Cooking'] } }
    });

    const stores = await prisma.store.findMany();
    let totalProfit = 0;
    const now = new Date();

    for (const store of stores) {
      const storeOrders = completedOrders.filter(o => o.storeId === store.id);
      const storeRevenue = storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      totalProfit += storeRevenue * 0.03;

      // Add cancellation penalties (4% of cancelled volume)
      const cancelledOrders = await prisma.order.findMany({
        where: {
          storeId: store.id,
          status: 'Cancelled',
          paymentStatus: 'Confirmed'
        }
      });
      const cancelledVolume = cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      totalProfit += cancelledVolume * 0.04;
    }

    res.json({
      totalVendors,
      totalStores,
      totalOrders,
      activeOrders,
      totalRevenue,
      todayRevenue,
      totalProfit: Math.round(totalProfit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1.1 Real-Time 3D Analytics & Spatial Aggregations
router.get('/realtime-analytics', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Fetch core collections from AWS RDS PostgreSQL
    const [pgOrders, pgStores, pgLocations, pgVendors] = await Promise.all([
      prisma.order.findMany({
        include: { store: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.store.findMany(),
      prisma.location.findMany(),
      prisma.admin.findMany({ where: { role: 'vendor' } })
    ]);

    const allOrders = pgOrders.map(normalizeOrder);
    const allStores = pgStores.map(normalizeStore);
    const allLocations = pgLocations.map(l => ({ ...l, _id: l.id }));
    const allVendors = pgVendors.map(v => ({ ...v, _id: v.id }));

    const completedOrders = allOrders.filter(o => o.status === 'Completed');
    const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
    const todayCompleted = todayOrders.filter(o => o.status === 'Completed');
    const lastHourOrders = allOrders.filter(o => new Date(o.createdAt) >= oneHourAgo);

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const todayRevenue = todayCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrdersCount = allOrders.length;
    const todayOrdersCount = todayOrders.length;

    const activeOrdersCount = allOrders.filter(o => ['Pending', 'Confirmed', 'Cooking'].includes(o.status)).length;
    const readyOrdersCount = allOrders.filter(o => o.status === 'Ready').length;
    const cancelledOrdersCount = allOrders.filter(o => o.status === 'Cancelled').length;

    const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
    const todayAvgOrderValue = todayCompleted.length > 0 ? Math.round(todayRevenue / todayCompleted.length) : 0;
    const ordersVelocityPerHour = lastHourOrders.length;

    // Platform Profit Calculation: 1-Month Free Trial Rule
    // During 30-day trial: 0% platform fee from vendors, 2% PG, 4% cancellation protection
    // Post-trial (5% rule): 3% platform commission + 2% PG + 4% cancellation protection
    let totalPlatformProfit = 0;
    for (const store of allStores) {
      const storeCompleted = completedOrders.filter(o => o.store && (o.store._id?.toString() === store._id.toString() || o.store.toString() === store._id.toString()));
      totalPlatformProfit += storeCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.03;

      // 4% cancellation penalty on cancelled confirmed orders
      const storeCancelled = allOrders.filter(o => 
        o.store && 
        (o.store._id?.toString() === store._id.toString() || o.store.toString() === store._id.toString()) && 
        o.status === 'Cancelled' && 
        o.paymentStatus === 'Confirmed'
      );
      totalPlatformProfit += storeCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.04;
    }

    // Hourly Distribution for 24 hours of today (Real-Time Current Date)
    const hourlyVelocity = Array.from({ length: 24 }, (_, h) => {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const ordersInHour = todayOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.getHours() === h;
      });
      const revInHour = ordersInHour
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        hour: hourStr,
        hourNum: h,
        orders: ordersInHour.length,
        revenue: revInHour,
        activeRate: ordersInHour.filter(o => ['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)).length
      };
    });

    // Real Last 7 Days Daily Breakdown strictly ending on TODAY
    const dailyVelocity7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayOrders = allOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= d && oDate < nextD;
      });

      const dayRevenue = dayOrders
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        date: dateStr,
        day: dayName,
        timeLabel: dateStr,
        orders: dayOrders.length,
        completedOrders: dayOrders.filter(o => o.status === 'Completed').length,
        revenue: dayRevenue
      };
    });

    // Real Last 30 Days Breakdown strictly ending on TODAY
    const monthlyVelocity30Days = Array.from({ length: 6 }, (_, i) => {
      const dEnd = new Date();
      dEnd.setDate(dEnd.getDate() - (5 - i) * 5);
      const dStart = new Date(dEnd);
      dStart.setDate(dStart.getDate() - 5);
      dStart.setHours(0, 0, 0, 0);

      const bucketOrders = allOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= dStart && oDate <= dEnd;
      });

      const bucketCompleted = bucketOrders.filter(o => o.status === 'Completed');
      const bucketRevenue = bucketCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const label = `${dStart.getDate()} ${dStart.toLocaleDateString('en-US', { month: 'short' })} - ${dEnd.getDate()} ${dEnd.toLocaleDateString('en-US', { month: 'short' })}`;

      return {
        timeLabel: label,
        revenue: bucketRevenue,
        orders: bucketOrders.length,
        completedOrders: bucketCompleted.length
      };
    });

    // All-Time Historical Days with Real Orders
    const orderDaysMap = new Map();
    allOrders.forEach(o => {
      const oDate = new Date(o.createdAt);
      const dateKey = oDate.toISOString().split('T')[0];
      const dateStr = oDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!orderDaysMap.has(dateKey)) {
        orderDaysMap.set(dateKey, { timeLabel: dateStr, revenue: 0, orders: 0, sortDate: oDate });
      }
      const item = orderDaysMap.get(dateKey);
      item.orders += 1;
      if (o.status === 'Completed') {
        item.revenue += (o.totalAmount || 0);
      }
    });
    const allTimeVelocity = Array.from(orderDaysMap.values()).sort((a, b) => a.sortDate - b.sortDate);

    // Market Spatial Performance
    const marketMap = {};
    for (const s of allStores) {
      const mkt = s.market || 'Unknown Market';
      if (!marketMap[mkt]) {
        marketMap[mkt] = {
          market: mkt,
          storeCount: 0,
          openStores: 0,
          orders: 0,
          completedOrders: 0,
          revenue: 0,
          stores: []
        };
      }
      marketMap[mkt].storeCount += 1;
      if (s.isOpen) marketMap[mkt].openStores += 1;
      marketMap[mkt].stores.push(s.name);
    }

    for (const o of allOrders) {
      const s = o.store;
      const mkt = s?.market || 'Unknown Market';
      if (marketMap[mkt]) {
        marketMap[mkt].orders += 1;
        if (o.status === 'Completed') {
          marketMap[mkt].completedOrders += 1;
          marketMap[mkt].revenue += (o.totalAmount || 0);
        }
      }
    }

    const marketAnalytics = Object.values(marketMap).sort((a, b) => b.revenue - a.revenue);

    // Top Selling Stores
    const storeRevenueMap = {};
    for (const o of completedOrders) {
      const storeId = o.store?._id || o.store?.id || o.storeId;
      if (!storeId) continue;
      if (!storeRevenueMap[storeId]) {
        storeRevenueMap[storeId] = {
          storeId,
          name: o.store?.name || 'Unknown Store',
          market: o.store?.market || 'Unknown Market',
          revenue: 0,
          completedOrders: 0
        };
      }
      storeRevenueMap[storeId].revenue += (o.totalAmount || 0);
      storeRevenueMap[storeId].completedOrders += 1;
    }

    const topStores = Object.values(storeRevenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Campus / Location Traffic & Revenue Breakdown
    const locationMap = new Map();
    allLocations.forEach(loc => {
      locationMap.set(loc._id.toString(), {
        locationId: loc._id,
        name: loc.name,
        type: loc.type || 'College',
        city: loc.city || 'Campus',
        storeCount: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalOrders: 0,
        todayOrders: 0,
        activeOrders: 0
      });
    });

    const unassignedLoc = {
      locationId: 'unassigned',
      name: 'General Campus / Unassigned',
      type: 'Campus',
      city: 'Campus',
      storeCount: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      totalOrders: 0,
      todayOrders: 0,
      activeOrders: 0
    };

    const storeLocationLookup = new Map();
    allStores.forEach(s => {
      const locId = s.locationId ? s.locationId.toString() : null;
      if (locId && locationMap.has(locId)) {
        storeLocationLookup.set(s._id.toString(), locId);
        locationMap.get(locId).storeCount += 1;
      } else {
        storeLocationLookup.set(s._id.toString(), 'unassigned');
        unassignedLoc.storeCount += 1;
      }
    });

    allOrders.forEach(o => {
      if (!o.store) return;
      const storeId = o.store._id ? o.store._id.toString() : (o.store.id ? o.store.id.toString() : o.store.toString());
      const locId = storeLocationLookup.get(storeId) || 'unassigned';
      const bucket = locId === 'unassigned' ? unassignedLoc : locationMap.get(locId);

      if (bucket) {
        bucket.totalOrders += 1;
        if (o.status === 'Completed') bucket.totalRevenue += (o.totalAmount || 0);
        if (new Date(o.createdAt) >= todayStart) {
          bucket.todayOrders += 1;
          if (o.status === 'Completed') bucket.todayRevenue += (o.totalAmount || 0);
        }
        if (['Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status)) {
          bucket.activeOrders += 1;
        }
      }
    });

    const zoneTraffic = Array.from(locationMap.values());
    if (unassignedLoc.totalOrders > 0 || unassignedLoc.storeCount > 0) {
      zoneTraffic.push(unassignedLoc);
    }

    // Top Stores Leaderboard
    const storeStats = allStores.map(store => {
      const sId = store._id.toString();
      const storeOrders = allOrders.filter(o => o.store && (o.store._id?.toString() === sId || o.store.id?.toString() === sId || o.store.toString() === sId));
      const sCompleted = storeOrders.filter(o => o.status === 'Completed');
      const sToday = storeOrders.filter(o => new Date(o.createdAt) >= todayStart);
      const sTodayCompleted = sToday.filter(o => o.status === 'Completed');
      
      const sTotalRevenue = sCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const sTodayRevenue = sTodayCompleted.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const activeQueue = storeOrders.filter(o => ['Pending', 'Confirmed', 'Cooking'].includes(o.status)).length;

      return {
        storeId: sId,
        name: store.name,
        market: store.market || 'Campus',
        isOpen: store.isOpen,
        totalRevenue: sTotalRevenue,
        todayRevenue: sTodayRevenue,
        totalOrders: storeOrders.length,
        todayOrders: sToday.length,
        activeQueue,
        productCount: Array.isArray(store.products) ? store.products.length : 0,
        isTrialStarted: store.isTrialStarted,
        isTrialOver: !!(store.isTrialStarted && store.trialEndDate && now > new Date(store.trialEndDate))
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Financial Flow Breakdown (100% Balanced Ledger)
    const pgGatewayFee = Math.round(totalRevenue * 0.02);
    const platformCommission = Math.round(totalPlatformProfit);
    const vendorShare = Math.max(0, totalRevenue - pgGatewayFee - platformCommission);
    const netPlatformMargin = Math.max(0, platformCommission);

    // Live Recent Activity Feed
    const liveFeed = allOrders.slice(0, 20).map(o => ({
      id: o._id,
      orderNumber: o.orderNumber,
      storeName: o.store?.name || 'Unknown Store',
      market: o.store?.market || 'Campus',
      totalAmount: o.totalAmount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod || 'Online',
      itemsCount: Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.quantity || 1), 0) : 1,
      createdAt: o.createdAt
    }));

    // Status Funnel Aggregations
    const orderStatusFunnel = [
      { status: 'Pending', count: allOrders.filter(o => o.status === 'Pending').length, color: '#f59e0b' },
      { status: 'Confirmed', count: allOrders.filter(o => o.status === 'Confirmed').length, color: '#3b82f6' },
      { status: 'Cooking', count: allOrders.filter(o => o.status === 'Cooking').length, color: '#8b5cf6' },
      { status: 'Ready', count: allOrders.filter(o => o.status === 'Ready').length, color: '#10b981' },
      { status: 'Completed', count: completedOrders.length, color: '#059669' },
      { status: 'Cancelled', count: cancelledOrdersCount, color: '#ef4444' }
    ];

    const metrics = {
      totalRevenue,
      todayRevenue,
      totalOrders: totalOrdersCount,
      todayOrders: todayOrdersCount,
      activeOrders: activeOrdersCount,
      readyOrders: readyOrdersCount,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrdersCount,
      avgOrderValue,
      todayAvgOrderValue,
      ordersVelocityPerHour,
      totalProfit: Math.round(totalPlatformProfit),
      vendorCount: allVendors.length,
      storeCount: allStores.length,
      openStoresCount: allStores.filter(s => s.isOpen).length,
      locationsCount: allLocations.length
    };

    // Response packet
    res.json({
      timestamp: new Date().toISOString(),
      metrics,
      hourlyVelocity,
      dailyVelocity7Days,
      monthlyVelocity30Days,
      allTimeVelocity,
      zoneTraffic,
      storeStats: storeStats.slice(0, 15),
      financeDistribution: {
        totalRevenue,
        vendorShare,
        platformCommission,
        pgGatewayFee,
        netPlatformMargin
      },
      liveFeed,
      kpis: {
        ...metrics,
        totalPlatformProfit: Math.round(totalPlatformProfit),
        totalVendors: allVendors.length,
        totalStores: allStores.length
      },
      charts: {
        hourlyVelocity,
        dailyVelocity7Days,
        monthlyVelocity30Days,
        allTimeVelocity,
        orderStatusFunnel
      },
      spatial: {
        marketAnalytics,
        topStores
      },
      locations: allLocations,
      recentOrders: allOrders.slice(0, 15)
    });
  } catch (err) {
    console.error('[superAdmin.realtimeAnalytics] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. Get All Vendors with Store Info
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await prisma.admin.findMany({
      where: { role: 'vendor' },
      include: { stores: true }
    });

    const vendorsWithStores = await Promise.all(vendors.map(async (vendor) => {
      const store = vendor.stores?.[0] || null;
      let revenue = 0;
      let orderCount = 0;
      let profitGenerated = 0;

      if (store) {
        const storeOrders = await prisma.order.findMany({
          where: { storeId: store.id }
        });
        const completed = storeOrders.filter(o => o.status === 'Completed');
        revenue = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        orderCount = storeOrders.length;

        profitGenerated = revenue * 0.03;

        const cancelledOrders = storeOrders.filter(o => o.status === 'Cancelled' && o.paymentStatus === 'Confirmed');
        const cancelledVolume = cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        profitGenerated += cancelledVolume * 0.04;
      }

      return {
        id: vendor.id,
        _id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        role: vendor.role,
        isBanned: vendor.isBanned,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        store: store ? {
          id: store.id,
          _id: store.id,
          name: store.name,
          market: store.market,
          isOpen: store.isOpen,
          productCount: Array.isArray(store.products) ? store.products.length : 0,
          isTrialStarted: store.isTrialStarted,
          trialEndDate: store.trialEndDate
        } : null,
        stats: {
          revenue,
          orderCount,
          profitGenerated: Math.round(profitGenerated)
        }
      };
    }));

    res.json(vendorsWithStores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get All Orders with Advanced Search, Filtering & Pagination
router.get('/orders', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 15, 
      search = '', 
      status = 'All', 
      storeId = 'All', 
      market = 'All', 
      paymentMethod = 'All', 
      paymentStatus = 'All',
      dateFilter = 'all',
      startDate,
      endDate,
      paginated = 'false'
    } = req.query;

    const where = {};

    // 1. Status Filter
    if (status && status !== 'All') {
      where.status = status;
    }

    // 2. Store Filter
    if (storeId && storeId !== 'All') {
      where.storeId = storeId;
    }

    // 3. Market Filter
    if (market && market !== 'All') {
      where.store = { ...where.store, market: market };
    }

    // 4. Payment Filters
    if (paymentMethod && paymentMethod !== 'All') {
      where.paymentMethod = paymentMethod;
    }
    if (paymentStatus && paymentStatus !== 'All') {
      where.paymentStatus = paymentStatus;
    }

    // 5. Date Range Filtering
    const now = new Date();
    if (dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: todayStart };
    } else if (dateFilter === 'yesterday') {
      const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      where.createdAt = { gte: yestStart, lte: yestEnd };
    } else if (dateFilter === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: past7 };
    } else if (dateFilter === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: past30 };
    } else if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 6. Search Query (orderNumber, customerName, customerPhone, storeName)
    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { orderNumber: { contains: query, mode: 'insensitive' } },
        { customerName: { contains: query, mode: 'insensitive' } },
        { customerPhone: { contains: query, mode: 'insensitive' } },
        { store: { name: { contains: query, mode: 'insensitive' } } }
      ];
    }

    // Parse pagination values
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    // Execute queries
    const [total, pgOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { store: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    const normalizedOrders = pgOrders.map(normalizeOrder);

    // If caller requested simple array (legacy) and not paginated
    if (paginated !== 'true' && !req.query.page && !req.query.search && status === 'All' && storeId === 'All') {
      return res.json(normalizedOrders);
    }

    // Base filter without status constraint to calculate tab badge counts
    const baseWhere = { ...where };
    delete baseWhere.status;

    const [allCount, pendingCount, confirmedCount, completedCount, cancelledCount] = await Promise.all([
      prisma.order.count({ where: baseWhere }),
      prisma.order.count({ where: { ...baseWhere, status: 'Pending' } }),
      prisma.order.count({ where: { ...baseWhere, status: 'Confirmed' } }),
      prisma.order.count({ where: { ...baseWhere, status: 'Completed' } }),
      prisma.order.count({ where: { ...baseWhere, status: 'Cancelled' } })
    ]);

    // Financial Metrics for the filtered subset
    const revenueAgg = await prisma.order.aggregate({
      where: { ...where, status: 'Completed' },
      _sum: { totalAmount: true },
      _count: { id: true }
    });
    const filteredRevenue = revenueAgg._sum.totalAmount || 0;
    const completedNum = revenueAgg._count.id || 0;
    const aov = completedNum > 0 ? Math.round(filteredRevenue / completedNum) : 0;

    return res.json({
      orders: normalizedOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      },
      counts: {
        all: allCount,
        pending: pendingCount,
        confirmed: confirmedCount,
        completed: completedCount,
        cancelled: cancelledCount
      },
      metrics: {
        totalRevenue: filteredRevenue,
        aov,
        completedOrders: completedNum
      }
    });
  } catch (err) {
    console.error('[superAdmin.orders] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 4. Delete Vendor and Associated Store
router.delete('/vendor/:id', async (req, res) => {
  try {
    const vendorId = req.params.id;

    const vendorToDelete = await prisma.admin.findUnique({ where: { id: vendorId } });
    if (!vendorToDelete) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (vendorToDelete.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete super admin accounts' });
    }

    // Cascade delete on store / orders handled by database or prisma
    await prisma.order.deleteMany({
      where: { store: { adminId: vendorId } }
    });
    await prisma.store.deleteMany({
      where: { adminId: vendorId }
    });
    await prisma.admin.delete({
      where: { id: vendorId }
    });

    res.json({ message: 'Vendor, store, and associated orders successfully deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4b. Suspend/Unban Vendor
router.put('/vendor/:id/suspend', async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await prisma.admin.findUnique({ where: { id: vendorId } });

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.role === 'superadmin') return res.status(403).json({ message: 'Cannot suspend super admins' });

    const updated = await prisma.admin.update({
      where: { id: vendorId },
      data: { isBanned: !vendor.isBanned }
    });

    res.json({ message: `Vendor ${updated.isBanned ? 'suspended' : 'unbanned'} successfully`, isBanned: updated.isBanned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Get All Stores Overview
router.get('/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        admin: { select: { id: true, name: true, email: true } },
        location: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const storesWithRevenue = await Promise.all(stores.map(async (store) => {
      const completedOrders = await prisma.order.findMany({
        where: { storeId: store.id, status: 'Completed' }
      });
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const rate = (store.commissionRate || 5) / 100;
      const estimatedFees = totalRevenue * rate;

      return {
        ...normalizeStore(store),
        productCount: Array.isArray(store.products) ? store.products.length : 0,
        totalRevenue,
        estimatedFees: estimatedFees.toFixed(2),
        isTrialOver,
        daysLeftInTrial: (store.isTrialStarted && trialEnd) ? 
          Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : null
      };
    }));

    res.json(storesWithRevenue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5b. Force Toggle Store Status
router.put('/store/:id/toggle-status', async (req, res) => {
  try {
    const store = await storeRepository.toggleStatus(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    telegramService.sendStatusAlert(store, store.isOpen).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.emit('store_status_update', { storeId: store._id || store.id, isOpen: store.isOpen });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json({ message: `Store forcefully ${store.isOpen ? 'opened' : 'closed'}`, isOpen: store.isOpen, isAutomated: store.isAutomated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5c. Force Toggle Store Hidden Status
router.put('/store/:id/toggle-hidden', async (req, res) => {
  try {
    const store = await storeRepository.toggleHidden(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const io = req.app.get('io');
    if (io) {
      io.emit('store_hidden_update', { storeId: store._id || store.id, isHidden: store.isHidden });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json({ message: `Store forcefully ${store.isHidden ? 'hidden' : 'unhidden'}`, isHidden: store.isHidden });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Global Order Abort
router.put('/order/:id/cancel', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot abort completed or already cancelled orders' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'Cancelled' }
    });

    res.json({ message: 'Order globally aborted', order: normalizeOrder(updatedOrder) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. Update Store Details (generic)
router.put('/store/:id/update-details', async (req, res) => {
  try {
    const { priority, openingTime, closingTime, isAutomated, name, market, storeType } = req.body;
    const updateData = {};
    if (priority !== undefined) updateData.priority = Number(priority);
    if (openingTime) updateData.openingTime = openingTime;
    if (closingTime) updateData.closingTime = closingTime;
    if (isAutomated !== undefined) updateData.isAutomated = Boolean(isAutomated);
    if (name) updateData.name = name;
    if (market) updateData.market = market;
    if (storeType) updateData.storeType = storeType;

    const store = await prisma.store.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ message: 'Store updated successfully', store: normalizeStore(store) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. Start Store Free Trial (30 Days)
router.post('/store/:id/start-trial', async (req, res) => {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const store = await prisma.store.update({
      where: { id: req.params.id },
      data: {
        isTrialStarted: true,
        trialStartDate: startDate,
        trialEndDate: endDate
      }
    });

    res.json({ message: '30-day free trial started successfully', store: normalizeStore(store) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. Finance: Get All Stores Pending & Completed Settlements
router.get(['/finance', '/finance/summary'], async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      include: { admin: { select: { id: true, name: true, email: true } } }
    });

    const now = new Date();

    const financeData = await Promise.all(stores.map(async (store) => {
      const pendingSettlements = await prisma.settlement.findMany({
        where: { storeId: store.id, status: 'pending' }
      });

      const latestSettlement = await prisma.settlement.findFirst({
        where: { storeId: store.id },
        orderBy: { periodEnd: 'desc' }
      });

      const unsettledOrders = await prisma.order.findMany({
        where: {
          storeId: store.id,
          status: 'Completed',
          isSettled: false
        }
      });

      const liveUnsettledRevenue = unsettledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const unsettledCancelled = await prisma.order.findMany({
        where: {
          storeId: store.id,
          status: 'Cancelled',
          paymentStatus: 'Confirmed',
          isSettled: false
        }
      });
      const liveCancelledVolume = unsettledCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Projected fees on live (unsettled) volume — standard rates + cancellation penalty if any
      const projectedGatewayFee = parseFloat((liveUnsettledRevenue * 0.02).toFixed(2));
      const projectedPlatformProfit = parseFloat((liveUnsettledRevenue * 0.03).toFixed(2));
      const projectedCancellationPenalty = parseFloat((liveCancelledVolume * 0.04).toFixed(2));
      const projectedNetPayable = parseFloat((liveUnsettledRevenue - projectedGatewayFee - projectedPlatformProfit - projectedCancellationPenalty).toFixed(2));

      let relevantSettlements = pendingSettlements;
      if (pendingSettlements.length === 0 && latestSettlement) {
        relevantSettlements = [latestSettlement];
      }

      const totalRevenue = relevantSettlements.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
      const gatewayFee = relevantSettlements.reduce((sum, s) => {
        const fees = s.feesBreakdown && typeof s.feesBreakdown === 'object' ? s.feesBreakdown : {};
        return sum + (fees.gatewayFee || 0);
      }, 0);
      const platformProfit = relevantSettlements.reduce((sum, s) => {
        const fees = s.feesBreakdown && typeof s.feesBreakdown === 'object' ? s.feesBreakdown : {};
        return sum + (fees.platformProfit || 0);
      }, 0);
      // Distinguish historical settled-at-zero (trial era) from genuinely zero
      const wasSettledUnderTrial = relevantSettlements.length > 0 && platformProfit === 0 &&
        relevantSettlements.every(s => {
          const fees = s.feesBreakdown && typeof s.feesBreakdown === 'object' ? s.feesBreakdown : {};
          return (fees.platformProfit === 0 || fees.platformProfit === undefined);
        });
      const cancellationPenalty = relevantSettlements.reduce((sum, s) => {
        const fees = s.feesBreakdown && typeof s.feesBreakdown === 'object' ? s.feesBreakdown : {};
        return sum + (fees.cancellationPenalty || 0);
      }, 0);
      const netPayable = relevantSettlements.reduce((sum, s) => sum + (s.netPayable || 0), 0);
      const totalDeduction = gatewayFee + platformProfit + cancellationPenalty;

      let settlementStatus = 'paid';
      if (pendingSettlements.length > 0) {
        settlementStatus = 'pending';
      } else if (liveUnsettledRevenue > 0) {
        settlementStatus = 'accumulating';
      }

      return {
        storeId: store.id,
        _id: store.id,
        storeName: store.name,
        ownerName: store.admin?.name || 'Unknown',
        upiId: store.upiId || 'Not Provided',
        totalRevenue,
        gatewayFee,
        platformProfit,
        wasSettledUnderTrial,
        cancellationPenalty,
        totalDeduction,
        netPayable,
        liveUnsettledRevenue,
        projectedGatewayFee,
        projectedPlatformProfit,
        projectedCancellationPenalty,
        projectedNetPayable,
        isTrialActive: false, // Trial concept removed — always standard commission
        settlementStatus,
        pendingCount: pendingSettlements.length
      };
    }));

    res.json(financeData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9b. Finance: Get Detailed Settlement History
router.get('/finance/history', async (req, res) => {
  try {
    const settlements = await prisma.settlement.findMany({
      include: {
        store: {
          include: { admin: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(settlements.map(normalizeSettlement));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Finance: Mark Settlement as Paid
router.post('/finance/settle', async (req, res) => {
  try {
    const { storeId, utrNumber } = req.body;
    if (!utrNumber) return res.status(400).json({ message: 'UTR Number is required' });

    const pendingSettlements = await prisma.settlement.findMany({
      where: { storeId: String(storeId), status: 'pending' }
    });

    if (pendingSettlements.length === 0) {
      return res.status(400).json({ message: 'No pending settlements found for this store.' });
    }

    await prisma.settlement.updateMany({
      where: { storeId: String(storeId), status: 'pending' },
      data: {
        status: 'completed',
        utrNumber,
        paidAt: new Date()
      }
    });

    res.json({ message: `Successfully settled ${pendingSettlements.length} records.`, count: pendingSettlements.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- LOCATION MANAGEMENT ---

// 12. Create a new Location
router.post('/locations', async (req, res) => {
  try {
    const { name, type, city } = req.body;
    const location = await prisma.location.create({
      data: {
        id: crypto.randomUUID(),
        name,
        type: type || 'College',
        city: city || ''
      }
    });
    res.status(201).json({ ...location, _id: location.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. Get all Locations
router.get('/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
    res.json(locations.map(l => ({ ...l, _id: l.id })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. Update location details
router.put('/locations/:id', async (req, res) => {
  try {
    const { name, type, city } = req.body;
    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: { name, type, city }
    });
    res.json({ ...location, _id: location.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 15. Delete a location
router.delete('/locations/:id', async (req, res) => {
  try {
    const storeCount = await prisma.store.count({ where: { locationId: req.params.id } });
    if (storeCount > 0) {
      return res.status(400).json({ message: 'Cannot delete location: It still has linked stores.' });
    }
    await prisma.location.delete({ where: { id: req.params.id } });
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 16. Update store location assignment
router.put('/store/:storeId/assign-location', async (req, res) => {
  try {
    const { locationId } = req.body;
    const store = await prisma.store.update({
      where: { id: req.params.storeId },
      data: { locationId: locationId || null }
    });
    res.json(normalizeStore(store));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// ⚡ DIRECT UPI INSTANT REFUND COMMAND DESK
// ==========================================

// 1. Get Pending Direct UPI Refunds
router.get('/refunds/pending', async (req, res) => {
  try {
    const pendingRefunds = await prisma.refund.findMany({
      where: { status: 'REQUESTED' },
      include: {
        order: {
          include: { store: { select: { name: true, market: true } } }
        }
      },
      orderBy: { createdAt: 'asc' } // oldest first for priority queue
    });

    res.json(pendingRefunds.map(normalizeRefund));
  } catch (err) {
    console.error('[superAdmin.refunds.pending] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. Get Refund Settlement History
router.get('/refunds/history', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;

    const where = { status: 'PROCESSED' };
    if (search.trim()) {
      where.OR = [
        { customerName: { contains: search.trim(), mode: 'insensitive' } },
        { customerPhone: { contains: search.trim(), mode: 'insensitive' } },
        { customerUpiId: { contains: search.trim(), mode: 'insensitive' } },
        { utr: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const total = await prisma.refund.count({ where });
    const refunds = await prisma.refund.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
            createdAt: true,
            items: true,
            store: { select: { name: true } }
          }
        }
      },
      orderBy: [{ settledAt: 'desc' }, { processedAt: 'desc' }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    res.json({
      refunds: refunds.map(normalizeRefund),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error('[superAdmin.refunds.history] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 3. Settle a Refund (Mark Paid)
router.post('/refunds/:id/settle', async (req, res) => {
  try {
    const { id } = req.params;
    const { utr } = req.body;

    if (!utr || typeof utr !== 'string' || !utr.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bank UTR / Transaction Reference Number is strictly required to settle a refund.' 
      });
    }

    const adminIdentifier = req.admin?.name || req.admin?.email || 'SUPER_ADMIN';

    const result = await refundService.settleRefund({
      refundId: id,
      utr: utr.trim(),
      settledBy: adminIdentifier,
      io: req.app.get('io')
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[superAdmin.refunds.settle] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 4. Update / Edit UTR post-settlement
router.put('/refunds/:id/utr', async (req, res) => {
  try {
    const { id } = req.params;
    const { utr } = req.body;
    const adminIdentifier = req.admin?.name || req.admin?.email || 'SUPER_ADMIN';

    const result = await refundService.updateRefundUtr({
      refundId: id,
      utr,
      updatedBy: adminIdentifier,
      io: req.app.get('io')
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[superAdmin.refunds.utr] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 5. Get Available Participating WhatsApp Groups
router.get('/refunds/whatsapp-groups', async (req, res) => {
  try {
    const groups = await whatsappMultiDeviceService.fetchParticipatingGroups();
    res.json(groups);
  } catch (err) {
    console.error('[superAdmin.refunds.groups] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 6. Get Refund Notification Config
router.get('/refunds/config', async (req, res) => {
  try {
    let config = await prisma.refundConfig.findFirst();
    if (!config) {
      config = await prisma.refundConfig.create({
        data: {
          id: 'singleton',
          groupJid: process.env.REFUND_ALERT_WHATSAPP_GROUP_JID || '',
          groupName: '',
          phoneNumbers: ['7985397373', '8295886832'],
          notifyGroup: true,
          notifyPhones: true
        }
      });
    }
    res.json(config);
  } catch (err) {
    console.error('[superAdmin.refunds.config.get] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 7. Update Refund Notification Config
router.post('/refunds/config', async (req, res) => {
  try {
    const { groupJid, groupName, phoneNumbers, notifyGroup, notifyPhones } = req.body;
    const updatedBy = req.admin?.name || req.admin?.email || 'SUPER_ADMIN';

    const config = await prisma.refundConfig.upsert({
      where: { id: 'singleton' },
      update: {
        ...(groupJid !== undefined && { groupJid }),
        ...(groupName !== undefined && { groupName }),
        ...(phoneNumbers !== undefined && { phoneNumbers }),
        ...(notifyGroup !== undefined && { notifyGroup }),
        ...(notifyPhones !== undefined && { notifyPhones }),
        updatedBy
      },
      create: {
        id: 'singleton',
        groupJid: groupJid || '',
        groupName: groupName || '',
        phoneNumbers: phoneNumbers || ['7985397373', '8295886832'],
        notifyGroup: notifyGroup !== undefined ? notifyGroup : true,
        notifyPhones: notifyPhones !== undefined ? notifyPhones : true,
        updatedBy
      }
    });

    res.json({ success: true, message: 'Refund alert configuration saved.', config });
  } catch (err) {
    console.error('[superAdmin.refunds.config.post] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const Admin = require('../models/Admin');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Location = require('../models/Location');
const telegramService = require('../services/telegramService');

// Public route for landing portal to fetch locations
router.get('/locations/public', async (req, res) => {
  try {
    const Location = require('../models/Location');
    const locations = await Location.find({ isHidden: { $ne: true } }).sort({ type: 1, name: 1 });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply super admin authentication middleware to all routes in this file
router.use(superAdminAuth);

// 1. Get Platform Stats
router.get('/stats', async (req, res) => {
  try {
    const totalVendors = await Admin.countDocuments({ role: 'vendor' });
    const totalStores = await Store.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Calculate total platform revenue (completed orders)
    const completedOrders = await Order.find({ status: 'Completed' });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletedOrders = completedOrders.filter(order => new Date(order.createdAt) >= today);
    const todayRevenue = todayCompletedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Active orders across all stores
    const activeOrders = await Order.countDocuments({ status: { $in: ['Pending', 'Confirmed'] } });

    const stores = await Store.find();
    let totalProfit = 0;
    const now = new Date();

    for (const store of stores) {
      const storeOrders = await Order.find({ store: store._id, status: 'Completed' });
      const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
      const isTrialOver = store.isTrialStarted && trialEnd && now > trialEnd;

      if (isTrialOver) {
        // Only apply 3% platform fee to orders completed AFTER the trial ended
        const postTrialOrders = storeOrders.filter(o => new Date(o.createdAt) > trialEnd);
        const postTrialRevenue = postTrialOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        totalProfit += postTrialRevenue * 0.03;
      }

      // Add cancellation penalties (4% of cancelled volume)
      const cancelledOrders = await Order.find({ 
        store: store._id, 
        status: 'Cancelled', 
        paymentStatus: 'Confirmed' 
      });
      const cancelledVolume = cancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
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
    const Location = require('../models/Location');
    
    // Time boundaries (IST based)
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Fetch core collections in parallel
    const [allOrders, allStores, allLocations, allVendors] = await Promise.all([
      Order.find().populate({ path: 'store', select: 'name market locationId isOpen isTrialStarted trialEndDate', strictPopulate: false }).sort({ createdAt: -1 }),
      Store.find().lean(),
      Location.find().lean(),
      Admin.find({ role: 'vendor' }).lean()
    ]);

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

    // Platform Profit Calculation
    let totalPlatformProfit = 0;
    for (const store of allStores) {
      const storeCompleted = completedOrders.filter(o => o.store && (o.store._id?.toString() === store._id.toString() || o.store.toString() === store._id.toString()));
      const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
      const isTrialOver = store.isTrialStarted && trialEnd && now > trialEnd;

      if (isTrialOver) {
        const postTrial = storeCompleted.filter(o => new Date(o.createdAt) > trialEnd);
        totalPlatformProfit += postTrial.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.03;
      }

      const storeCancelled = allOrders.filter(o => 
        o.store && 
        (o.store._id?.toString() === store._id.toString() || o.store.toString() === store._id.toString()) && 
        o.status === 'Cancelled' && 
        o.paymentStatus === 'Confirmed'
      );
      totalPlatformProfit += storeCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.04;
    }

    // Hourly Distribution for 24 hours of today
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

    // Fallback unassigned bucket
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

    // Associate stores with locations
    const storeLocationLookup = new Map();
    allStores.forEach(s => {
      const locId = s.locationId?._id ? s.locationId._id.toString() : (s.locationId ? s.locationId.toString() : (s.location?._id ? s.location._id.toString() : (s.location ? s.location.toString() : null)));
      if (locId && locationMap.has(locId)) {
        storeLocationLookup.set(s._id.toString(), locId);
        locationMap.get(locId).storeCount += 1;
      } else {
        storeLocationLookup.set(s._id.toString(), 'unassigned');
        unassignedLoc.storeCount += 1;
      }
    });

    // Aggregate orders by location
    allOrders.forEach(o => {
      if (!o.store) return;
      const storeId = o.store._id ? o.store._id.toString() : o.store.toString();
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
      const storeOrders = allOrders.filter(o => o.store && (o.store._id?.toString() === sId || o.store.toString() === sId));
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

    // Financial Flow Breakdown
    const vendorShare = Math.round(totalRevenue * 0.97);
    const platformCommission = Math.round(totalPlatformProfit);
    const pgGatewayFee = Math.round(totalRevenue * 0.02); // ~2% PG standard pass-through
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

    res.json({
      metrics: {
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
        openStoresCount: allStores.filter(s => s.isOpen).length
      },
      hourlyVelocity,
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
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Realtime analytics error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. Get All Vendors with Store Info
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Admin.find({ role: 'vendor' }).select('-password');
    const vendorsWithStores = await Promise.all(vendors.map(async (vendor) => {
      const store = await Store.findOne({ admin: vendor._id });
      
      // Calculate vendor revenue if store exists
      let revenue = 0;
      let orderCount = 0;
      if (store) {
          const vendorOrders = await Order.find({ store: store._id, status: 'Completed' });
          revenue = vendorOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          orderCount = await Order.countDocuments({ store: store._id });
      }

      // Calculate profit contribution
      let profitGenerated = 0;
      const now = new Date();
      const trialEnd = store ? (store.trialEndDate ? new Date(store.trialEndDate) : null) : null;
      const isTrialOver = store && store.isTrialStarted && trialEnd && now > trialEnd;

      if (isTrialOver) {
        // Find orders completed after trial ended to calculate platform commission
        const postTrialOrders = await Order.find({
            store: store._id,
            status: 'Completed',
            createdAt: { $gt: trialEnd }
        });
        const postTrialRevenue = postTrialOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        profitGenerated = postTrialRevenue * 0.03;
      }

      // Add penalty profit from cancelled orders
      if (store) {
        const cancelledOrders = await Order.find({ 
            store: store._id, 
            status: 'Cancelled', 
            paymentStatus: 'Confirmed' 
        });
        const cancelledVolume = cancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        profitGenerated += cancelledVolume * 0.04;
      }

      return {
        ...vendor.toObject(),
        store: store ? {
            id: store._id,
            name: store.name,
            market: store.market,
            isOpen: store.isOpen,
            productCount: store.products.length,
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

// 3. Get All Orders (Recent first)
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate({ path: 'store', select: 'name market' })
            .limit(100); // Limit to 100 recent for performance
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Delete Vendor and Associated Store
router.delete('/vendor/:id', async (req, res) => {
    try {
        const vendorId = req.params.id;
        
        // Prevent deleting another superadmin (just in case)
        const vendorToDelete = await Admin.findById(vendorId);
        if (!vendorToDelete) {
             return res.status(404).json({ message: 'Vendor not found' });
        }
        if (vendorToDelete.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot delete super admin accounts' });
        }

        // Find the store associated with the vendor
        const store = await Store.findOne({ admin: vendorId });
        
        // Delete orders associated with the store
        if (store) {
            await Order.deleteMany({ store: store._id });
            // Delete the store
            await Store.deleteOne({ _id: store._id });
        }

        // Finally, delete the vendor account
        await Admin.deleteOne({ _id: vendorId });

        res.json({ message: 'Vendor, store, and associated orders successfully deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4b. Suspend/Unban Vendor
router.put('/vendor/:id/suspend', async (req, res) => {
    try {
        const vendorId = req.params.id;
        const vendor = await Admin.findById(vendorId);
        
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        if (vendor.role === 'superadmin') return res.status(403).json({ message: 'Cannot suspend super admins' });

        vendor.isBanned = !vendor.isBanned;
        await vendor.save();

        res.json({ message: `Vendor ${vendor.isBanned ? 'suspended' : 'unbanned'} successfully`, isBanned: vendor.isBanned });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Get All Stores Overview
router.get('/stores', async (req, res) => {
    try {
        const stores = await Store.find()
            .populate({ path: 'admin', select: 'name email' });
            
        const storesWithRevenue = await Promise.all(stores.map(async (store) => {
            const completedOrders = await Order.find({ store: store._id, status: 'Completed' });
            const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            // Calculate fees if trial ended
            let estimatedFees = 0;
            const now = new Date();
            const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
            const isTrialOver = store.isTrialStarted && trialEnd && now > trialEnd;

            if (isTrialOver) {
                // Use the commissionRate from the store model (defaulting to 5 if not set)
                const rate = (store.commissionRate || 5) / 100;
                
                // Only calculate fees on orders completed AFTER the trial ended
                const postTrialOrders = completedOrders.filter(o => new Date(o.createdAt) > trialEnd);
                const postTrialRevenue = postTrialOrders.reduce((sum, order) => sum + order.totalAmount, 0);
                estimatedFees = postTrialRevenue * rate;
            }

            return {
                ...store.toObject(),
                productCount: store.products.length,
                totalRevenue: totalRevenue,
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
        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        store.isOpen = !store.isOpen;
        // Force toggle disabling automation prevents flip-flopping
        store.isAutomated = false;
        await store.save();

        // Notify via Telegram
        await telegramService.sendStatusAlert(store, store.isOpen);

        res.json({ message: `Store forcefully ${store.isOpen ? 'opened' : 'closed'}`, isOpen: store.isOpen, isAutomated: store.isAutomated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5c. Force Toggle Store Hidden Status
router.put('/store/:id/toggle-hidden', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        store.isHidden = !store.isHidden;
        await store.save();

        res.json({ message: `Store forcefully ${store.isHidden ? 'hidden' : 'unhidden'}`, isHidden: store.isHidden });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Global Order Abort
router.put('/order/:id/cancel', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.status === 'Completed' || order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Cannot abort completed or already cancelled orders' });
        }

        order.status = 'Cancelled';
        await order.save();

        res.json({ message: 'Order globally aborted', order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. Update Store Details (generic)
router.put('/store/:id/update-details', async (req, res) => {
    try {
        const { priority, openingTime, closingTime, isAutomated, name, market, storeType } = req.body;
        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        if (priority !== undefined) store.priority = Number(priority);
        if (openingTime) store.openingTime = openingTime;
        if (closingTime) store.closingTime = closingTime;
        if (isAutomated !== undefined) store.isAutomated = isAutomated;
        if (name) store.name = name;
        if (market) store.market = market;
        if (storeType) store.storeType = storeType;
        
        await store.save();
        res.json({ message: 'Store updated successfully', store });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 8. Start Store Free Trial (30 Days)
router.post('/store/:id/start-trial', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30);

        store.isTrialStarted = true;
        store.trialStartDate = startDate;
        store.trialEndDate = endDate;
        
        await store.save();

        res.json({ message: '30-day free trial started successfully', store });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 9. Finance: Get All Stores Pending & Completed Settlements
router.get('/finance/summary', async (req, res) => {
    try {
        const Settlement = require('../models/Settlement');
        
        // Fetch all stores
        const stores = await Store.find().populate('admin', 'name email');
        
        const financeData = await Promise.all(stores.map(async (store) => {
            // Find all PENDING settlements for this store
            const pendingSettlements = await Settlement.find({ store: store._id, status: 'pending' });
            
            // Calculate LIVE Unsettled Balance (Orders completed after the last settlement period)
            const latestSettlement = await Settlement.findOne({ store: store._id }).sort({ periodEnd: -1 });
            const lastPeriodEnd = latestSettlement ? latestSettlement.periodEnd : new Date(0);

            const unsettledOrders = await Order.find({
                store: store._id,
                status: 'Completed',
                isSettled: { $ne: true }
            });

            const liveUnsettledRevenue = unsettledOrders.reduce((sum, o) => sum + o.totalAmount, 0);

            let relevantSettlements = pendingSettlements;
            if (pendingSettlements.length === 0 && latestSettlement) {
                relevantSettlements = [latestSettlement];
            }

            // Aggregate pending or latest amounts
            const totalRevenue = relevantSettlements.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
            const gatewayFee = relevantSettlements.reduce((sum, s) => sum + (s.feesBreakdown?.gatewayFee || 0), 0);
            const platformProfit = relevantSettlements.reduce((sum, s) => sum + (s.feesBreakdown?.platformProfit || 0), 0);
            const cancellationPenalty = relevantSettlements.reduce((sum, s) => sum + (s.feesBreakdown?.cancellationPenalty || 0), 0);
            const netPayable = relevantSettlements.reduce((sum, s) => sum + (s.netPayable || 0), 0);
            const totalDeduction = gatewayFee + platformProfit + cancellationPenalty;

            const now = new Date();
            const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
            const isTrialActive = store.isTrialStarted && trialEnd && now < trialEnd;

            let settlementStatus = 'paid';
            if (pendingSettlements.length > 0) {
                settlementStatus = 'pending';
            } else if (liveUnsettledRevenue > 0) {
                settlementStatus = 'accumulating';
            }

            return {
                storeId: store._id,
                storeName: store.name,
                ownerName: store.admin?.name || 'Unknown',
                upiId: store.upiId || 'Not Provided',
                totalRevenue,
                gatewayFee,
                platformProfit,
                cancellationPenalty,
                totalDeduction,
                netPayable,
                liveUnsettledRevenue,
                isTrialActive,
                settlementStatus,
                trialEndDate: store.trialEndDate,
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
        const Settlement = require('../models/Settlement');
        const settlements = await Settlement.find()
            .populate({ path: 'store', select: 'name market admin', populate: { path: 'admin', select: 'name' } })
            .sort({ createdAt: -1 });
            
        res.json(settlements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 10. Finance: Mark Settlement as Paid
router.post('/finance/settle', async (req, res) => {
    try {
        const { storeId, utrNumber } = req.body;
        if (!utrNumber) return res.status(400).json({ message: 'UTR Number is required' });

        const Settlement = require('../models/Settlement');

        // Find all pending settlements for the store and mark them as completed
        const pendingSettlements = await Settlement.find({ store: storeId, status: 'pending' });
        
        if (pendingSettlements.length === 0) {
            return res.status(400).json({ message: 'No pending settlements found for this store.' });
        }

        for (const settlement of pendingSettlements) {
            settlement.status = 'completed';
            settlement.utrNumber = utrNumber;
            settlement.paidAt = new Date();
            await settlement.save();
        }

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
    const location = new Location({ name, type, city });
    await location.save();
    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. Get all Locations
router.get('/locations', async (req, res) => {
  try {
    const locations = await Location.find().sort({ type: 1, name: 1 });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. Update location details
router.put('/locations/:id', async (req, res) => {
  try {
    const { name, type, city, isHidden } = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { name, type, city, isHidden },
      { new: true }
    );
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 15. Delete a location
router.delete('/locations/:id', async (req, res) => {
  try {
    // Check if any stores are still linked to this location
    const storeCount = await Store.countDocuments({ locationId: req.params.id });
    if (storeCount > 0) {
      return res.status(400).json({ message: 'Cannot delete location: It still has linked stores.' });
    }
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 16. Update store location assignment
router.put('/store/:storeId/assign-location', async (req, res) => {
  try {
    const { locationId } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.storeId,
      { locationId },
      { new: true }
    );
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

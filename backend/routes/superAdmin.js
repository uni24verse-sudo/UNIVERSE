const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const Admin = require('../models/Admin');
const Store = require('../models/Store');
const Order = require('../models/Order');

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
        // Only apply 3% to post-trial volume technically, 
        // but for a global overview, we use the store's current status
        const storeRevenue = storeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        totalProfit += storeRevenue * 0.03;
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
        profitGenerated = revenue * 0.03;
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
                estimatedFees = totalRevenue * rate;
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
        const { priority, openingTime, closingTime, isAutomated, name, market } = req.body;
        const store = await Store.findById(req.params.id);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        if (priority !== undefined) store.priority = Number(priority);
        if (openingTime) store.openingTime = openingTime;
        if (closingTime) store.closingTime = closingTime;
        if (isAutomated !== undefined) store.isAutomated = isAutomated;
        if (name) store.name = name;
        if (market) store.market = market;
        
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

// 9. Finance: Get All Stores Monthly Stats
router.get('/finance/summary', async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const stores = await Store.find().populate('admin', 'name email');
        
        const financeData = await Promise.all(stores.map(async (store) => {
            // Find monthly completed orders for this store
            const monthlyOrders = await Order.find({
                store: store._id,
                status: 'Completed',
                createdAt: { $gte: startDate, $lte: endDate }
            });

            // Find monthly cancelled orders (vendor-cancelled, payment was confirmed)
            const cancelledOrders = await Order.find({
                store: store._id,
                status: 'Cancelled',
                paymentStatus: 'Confirmed',
                createdAt: { $gte: startDate, $lte: endDate }
            });

            const totalMonthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            const cancelledOrdersTotal = cancelledOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            // Cancellation Penalty: 4% of cancelled order value (2% gateway + 2% penalty)
            const cancellationPenalty = cancelledOrdersTotal * 0.04;
            const cancelledCount = cancelledOrders.length;
            
            // Tiered Commission Logic:
            // Month 1 (Trial): 2% Gateway Fee only, 0% Profit.
            // Month 2+ (Post Trial): 2% Gateway Fee + 3% Platform Profit = 5% Total.
            const now = new Date();
            const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
            const isTrialActive = store.isTrialStarted && trialEnd && now < trialEnd;
            
            const gatewayRate = 0.02; // Always 2%
            const profitRate = isTrialActive ? 0 : 0.03; // 0% if trial, 3% if post-trial
            
            const gatewayFee = totalMonthlyRevenue * gatewayRate;
            const platformProfit = totalMonthlyRevenue * profitRate;
            const totalDeduction = gatewayFee + platformProfit + cancellationPenalty;
            const netPayable = totalMonthlyRevenue - totalDeduction;

            // Check if already settled in our historical model
            const Settlement = require('../models/Settlement');
            const settlement = await Settlement.findOne({ store: store._id, month, year });

            return {
                storeId: store._id,
                storeName: store.name,
                ownerName: store.admin?.name || 'Unknown',
                upiId: store.upiId || 'Not Provided',
                totalRevenue: totalMonthlyRevenue,
                gatewayFee,
                platformProfit,
                cancellationPenalty,
                cancelledCount,
                cancelledOrdersTotal,
                totalDeduction,
                netPayable,
                isTrialActive,
                settlementStatus: settlement ? settlement.status : 'pending',
                trialEndDate: store.trialEndDate
            };
        }));

        res.json(financeData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 10. Finance: Mark Settlement as Paid
router.post('/finance/settle', async (req, res) => {
    try {
        const { storeId, month, year, totalRevenue, commissionAmount, netPayable } = req.body;
        const Settlement = require('../models/Settlement');

        let settlement = await Settlement.findOne({ store: storeId, month, year });
        
        if (settlement) {
            settlement.status = 'paid';
            settlement.paidAt = new Date();
        } else {
            settlement = new Settlement({
                store: storeId,
                month,
                year,
                totalRevenue,
                commissionAmount,
                netPayable,
                status: 'paid',
                paidAt: new Date()
            });
        }

        await settlement.save();
        res.json({ message: 'Settlement marked as paid successfully', settlement });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

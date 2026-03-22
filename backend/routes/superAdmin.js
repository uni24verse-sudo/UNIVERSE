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

    res.json({
      totalVendors,
      totalStores,
      totalOrders,
      activeOrders,
      totalRevenue,
      todayRevenue
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

      return {
        ...vendor.toObject(),
        store: store ? {
            id: store._id,
            name: store.name,
            market: store.market,
            isOpen: store.isOpen,
            productCount: store.products.length
        } : null,
        stats: {
            revenue,
            orderCount
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
            const revenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            return {
                ...store.toObject(),
                productCount: store.products.length,
                totalRevenue: revenue
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
        await store.save();

        res.json({ message: `Store forcefully ${store.isOpen ? 'opened' : 'closed'}`, isOpen: store.isOpen });
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

module.exports = router;

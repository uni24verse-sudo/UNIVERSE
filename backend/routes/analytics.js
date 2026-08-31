const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Store = require('../models/Store');
const mongoose = require('mongoose');

// GET Smart Pairings for a Store
router.get('/store/:storeId/pairings', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { currentItemIds } = req.query; // Comma separated IDs
    const cartItemIds = currentItemIds ? currentItemIds.split(',').filter(id => id && id !== 'undefined') : [];

    // 1. Fetch Store to get all available products
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    let recommendedProductIds = new Set();

    // 2. Data Driven Analysis (Learning from past orders)
    if (cartItemIds.length > 0) {
      const pastOrders = await Order.find({ 
        store: storeId, 
        status: 'Completed',
        'items.productId': { $in: cartItemIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).limit(500); // Analyze last 500 orders

      const frequencyMap = {};
      
      pastOrders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId && !cartItemIds.includes(item.productId.toString())) {
            const pId = item.productId.toString();
            frequencyMap[pId] = (frequencyMap[pId] || 0) + 1;
          }
        });
      });

      // Sort by frequency
      const sortedPairings = Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      sortedPairings.slice(0, 4).forEach(id => recommendedProductIds.add(id));
    }

    // 3. Cold Start / Fallback Logic
    // If not enough data-driven recommendations, fill with Beverages, Shakes, Desserts, or Top Items
    if (recommendedProductIds.size < 4) {
      const priorityCategories = ['Beverages', 'Drinks', 'Shakes', 'Desserts', 'Snacks', 'Sides'];
      const fallbackItems = store.products
        .filter(p => p.isAvailable && !cartItemIds.includes(p._id.toString()) && !recommendedProductIds.has(p._id.toString()))
        .sort((a, b) => {
          // Prioritize by category
          const aIndex = priorityCategories.findIndex(cat => a.category?.toLowerCase().includes(cat.toLowerCase()));
          const bIndex = priorityCategories.findIndex(cat => b.category?.toLowerCase().includes(cat.toLowerCase()));
          
          if (aIndex !== -1 && bIndex === -1) return -1;
          if (aIndex === -1 && bIndex !== -1) return 1;
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          return 0;
        });

      fallbackItems.slice(0, 4 - recommendedProductIds.size).forEach(p => recommendedProductIds.add(p._id.toString()));
    }

    // 4. Return the full product objects
    const recommendedProducts = store.products.filter(p => recommendedProductIds.has(p._id.toString()) && p.isAvailable);

    res.json(recommendedProducts);
  } catch (err) {
    console.error('Smart Pairing Error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

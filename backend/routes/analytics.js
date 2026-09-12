const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// GET Smart Pairings for a Store
router.get('/store/:storeId/pairings', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { currentItemIds } = req.query; // Comma separated IDs
    const cartItemIds = currentItemIds ? currentItemIds.split(',').filter(id => id && id !== 'undefined').map(String) : [];

    // 1. Fetch Store to get all available products
    const store = await prisma.store.findUnique({
      where: { id: String(storeId) }
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const products = Array.isArray(store.products) ? store.products : [];
    let recommendedProductIds = new Set();

    // 2. Data Driven Analysis (Learning from past orders)
    if (cartItemIds.length > 0) {
      const pastOrders = await prisma.order.findMany({
        where: {
          storeId: String(storeId),
          status: 'Completed'
        },
        take: 500,
        orderBy: { createdAt: 'desc' }
      });

      const frequencyMap = {};
      
      pastOrders.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const orderProductIds = items.map(i => String(i.productId || i.id || ''));

        // Check if any cart item is in this order
        const hasCartItem = cartItemIds.some(cId => orderProductIds.includes(cId));
        if (hasCartItem) {
          items.forEach(item => {
            const pId = String(item.productId || item.id || '');
            if (pId && !cartItemIds.includes(pId)) {
              frequencyMap[pId] = (frequencyMap[pId] || 0) + 1;
            }
          });
        }
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
      const fallbackItems = products
        .filter(p => {
          const pId = String(p._id || p.id);
          return p.isAvailable && !cartItemIds.includes(pId) && !recommendedProductIds.has(pId);
        })
        .sort((a, b) => {
          const aIndex = priorityCategories.findIndex(cat => a.category?.toLowerCase().includes(cat.toLowerCase()));
          const bIndex = priorityCategories.findIndex(cat => b.category?.toLowerCase().includes(cat.toLowerCase()));
          
          if (aIndex !== -1 && bIndex === -1) return -1;
          if (aIndex === -1 && bIndex !== -1) return 1;
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          return 0;
        });

      fallbackItems.slice(0, 4 - recommendedProductIds.size).forEach(p => {
        recommendedProductIds.add(String(p._id || p.id));
      });
    }

    // 4. Return the full product objects
    const recommendedProducts = products.filter(p => {
      const pId = String(p._id || p.id);
      return recommendedProductIds.has(pId) && p.isAvailable;
    });

    res.json(recommendedProducts);
  } catch (err) {
    console.error('[analytics] Smart Pairing Error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

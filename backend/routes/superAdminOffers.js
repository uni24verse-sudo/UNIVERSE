const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const superAdminAuth = require('../middleware/superAdminAuth');
const prisma = require('../config/prisma');
const globalOfferRepository = require('../repositories/globalOfferRepository');
const storeRepository = require('../repositories/storeRepository');
const { normalizeStore } = require('../utils/pgAdapter');

// All routes require SuperAdmin authorization
router.use(superAdminAuth);

/**
 * 1. GET ALL OFFERS (Global Platform Deals + All Stall Deals)
 */
router.get('/', async (req, res) => {
  try {
    const [globalOffers, stores] = await Promise.all([
      globalOfferRepository.getAll(),
      prisma.store.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          market: true,
          offers: true,
          isOpen: true,
          location: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    // Flatten store offers with store context
    const storeOffers = [];
    stores.forEach(s => {
      const rawOffers = Array.isArray(s.offers) ? s.offers : [];
      rawOffers.forEach(o => {
        storeOffers.push({
          ...o,
          _id: o.id,
          storeId: s.id,
          storeName: s.name,
          storeCategory: s.category,
          storeMarket: s.market || '',
          storeLocation: s.location?.name || '',
          isGlobal: false
        });
      });
    });

    const activeGlobalCount = globalOffers.filter(o => o.isActive !== false).length;
    const activeStoreCount = storeOffers.filter(o => o.isActive !== false).length;

    res.json({
      success: true,
      globalOffers,
      storeOffers,
      stores: stores.map(s => ({ id: s.id, name: s.name, category: s.category })),
      summary: {
        totalGlobalOffers: globalOffers.length,
        activeGlobalOffers: activeGlobalCount,
        totalStoreOffers: storeOffers.length,
        activeStoreOffers: activeStoreCount,
        totalPromotions: globalOffers.length + storeOffers.length
      }
    });
  } catch (err) {
    console.error('[superAdminOffers] Error fetching offers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. CREATE A GLOBAL PLATFORM OFFER (Valid for all carts / all stores)
 */
router.post('/global', async (req, res) => {
  try {
    const { code, title, description, discountType, discountValue, minOrderValue, maxDiscountCap, badgeText, bannerText, applicableStores } = req.body;

    if (!code || !title || discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'Code, title, and discount value are required' });
    }

    const offer = await globalOfferRepository.create({
      code,
      title,
      description,
      discountType: discountType || 'PERCENTAGE_CART',
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscountCap: Number(maxDiscountCap) || 0,
      badgeText: badgeText || (discountType?.includes('PERCENTAGE') ? `${discountValue}% OFF` : `₹${discountValue} OFF`),
      bannerText: bannerText || '',
      applicableStores: Array.isArray(applicableStores) ? applicableStores : [],
      isActive: true
    });

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('store_offers_update', { isGlobal: true, updatedOffer: offer });
    }

    res.status(201).json({ success: true, offer });
  } catch (err) {
    console.error('[superAdminOffers] Error creating global offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. UPDATE A GLOBAL PLATFORM OFFER
 */
router.put('/global/:id', async (req, res) => {
  try {
    const updated = await globalOfferRepository.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Global offer not found' });
    }

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('store_offers_update', { isGlobal: true, updatedOffer: updated });
    }

    res.json({ success: true, offer: updated });
  } catch (err) {
    console.error('[superAdminOffers] Error updating global offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. DELETE A GLOBAL PLATFORM OFFER
 */
router.delete('/global/:id', async (req, res) => {
  try {
    await globalOfferRepository.delete(req.params.id);

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('store_offers_update', { isGlobal: true, deletedOfferId: req.params.id });
    }

    res.json({ success: true, message: 'Global offer removed' });
  } catch (err) {
    console.error('[superAdminOffers] Error deleting global offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. CREATE OR UPDATE AN OFFER FOR A SPECIFIC STORE AS SUPERADMIN
 */
router.post('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    // Use adminId from store so it passes authorization inside repository
    const result = await storeRepository.createStoreOffer(storeId, store.adminId, req.body);

    const io = req.app.get('io');
    if (io) {
      const sId = String(storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error('[superAdminOffers] Error creating store offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 6. UPDATE A STORE OFFER AS SUPERADMIN
 */
router.put('/store/:storeId/:offerId', async (req, res) => {
  try {
    const { storeId, offerId } = req.params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const result = await storeRepository.updateStoreOffer(storeId, store.adminId, offerId, req.body);

    const io = req.app.get('io');
    if (io) {
      const sId = String(storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[superAdminOffers] Error updating store offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 7. DELETE A STORE OFFER AS SUPERADMIN
 */
router.delete('/store/:storeId/:offerId', async (req, res) => {
  try {
    const { storeId, offerId } = req.params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const result = await storeRepository.deleteStoreOffer(storeId, store.adminId, offerId);

    const io = req.app.get('io');
    if (io) {
      const sId = String(storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, deletedOfferId: offerId });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, deletedOfferId: offerId });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[superAdminOffers] Error deleting store offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

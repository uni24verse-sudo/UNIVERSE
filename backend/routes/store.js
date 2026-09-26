const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../config/prisma');
const storeRepository = require('../repositories/storeRepository');
const { normalizeStore, normalizeOrder } = require('../utils/pgAdapter');
const telegramService = require('../services/telegramService');
const refundService = require('../services/refundService');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Create a Store
router.post('/create', auth, async (req, res) => {
  try {
    let { name, category, market, upiId, telegramChatId, locationId } = req.body;
    let finalMarket = market || 'BH1 Market';
    const adminId = req.admin.id || req.admin._id;

    // Smart location resolution: if locationId not provided, infer from market or vendor's other stalls
    if (!locationId) {
      if (market) {
        const allLocs = await prisma.location.findMany().catch(() => []);
        const matched = allLocs.find(l => {
          if (!l.markets) return false;
          const mList = l.markets.split(',').map(m => m.trim());
          return mList.includes(market.trim());
        });
        if (matched) {
          locationId = matched.id;
        }
      }
      if (!locationId) {
        const vendorStores = await prisma.store.findMany({
          where: { adminId: String(adminId), locationId: { not: null } },
          take: 1
        }).catch(() => []);
        if (vendorStores.length > 0 && vendorStores[0].locationId) {
          locationId = vendorStores[0].locationId;
        }
      }
    }

    if (locationId) {
      const loc = await prisma.location.findUnique({ where: { id: String(locationId) } }).catch(() => null);
      if (loc && loc.type === 'External') {
        finalMarket = loc.name;
      }
    }

    const savedStore = await storeRepository.createStore({
      adminId,
      name,
      category: category || 'General',
      market: finalMarket,
      locationId: locationId || null,
      upiId: upiId || '',
      telegramChatId: telegramChatId || ''
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('store_created', savedStore);
      io.to('superadmin_room').emit('superadmin:store_created', savedStore);
    }

    res.status(201).json(savedStore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's own stores (Multiple) - Employees strictly locked to their single assigned stall
router.get('/my-stores', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const isStaff = req.admin.role === 'staff' || req.admin.role === 'employee';

    if (isStaff && req.admin.storeId) {
      const singleStore = await storeRepository.getStoreById(req.admin.storeId);
      return res.json(singleStore ? [singleStore] : []);
    }

    const storesWithBilling = await storeRepository.getVendorStores(adminId);
    res.json(storesWithBilling);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Trending/Most Ordered Items (Data-Driven Discovery)
router.get('/trending', async (req, res) => {
  try {
    const { locationId } = req.query;

    const completedOrders = await prisma.order.findMany({
      where: { status: 'Completed' },
      take: 500,
      orderBy: { createdAt: 'desc' },
      select: { items: true, storeId: true }
    });

    const frequencyMap = {};
    completedOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const pId = String(item.productId || item.id || '');
        if (pId) {
          frequencyMap[pId] = (frequencyMap[pId] || 0) + (Number(item.quantity) || 1);
        }
      });
    });

    const storeFilter = {
      isHidden: false,
      name: { not: 'Hhh' }
    };
    if (locationId) {
      storeFilter.locationId = String(locationId);
    }

    const activeStores = await prisma.store.findMany({
      where: storeFilter
    });

    const trendingItems = [];
    for (const store of activeStores) {
      const products = Array.isArray(store.products) ? store.products : [];
      products.forEach(p => {
        const pId = String(p._id || p.id);
        const count = frequencyMap[pId] || 0;
        if (count > 0) {
          trendingItems.push({
            storeId: store.id,
            _id: pId,
            storeName: store.name,
            market: store.market,
            isOpen: store.isOpen,
            productId: pId,
            name: p.name,
            price: p.price,
            image: p.image,
            category: p.category,
            isAvailable: p.isAvailable !== false,
            orderCount: count
          });
        }
      });
    }

    trendingItems.sort((a, b) => b.orderCount - a.orderCount);

    // If not enough trending items, fallback to items with images
    if (trendingItems.length < 8) {
      for (const store of activeStores) {
        const products = Array.isArray(store.products) ? store.products : [];
        for (const p of products) {
          const pId = String(p._id || p.id);
          if (p.image && !trendingItems.some(ti => ti.productId === pId)) {
            trendingItems.push({
              storeId: store.id,
              _id: pId,
              storeName: store.name,
              market: store.market,
              isOpen: store.isOpen,
              productId: pId,
              name: p.name,
              price: p.price,
              image: p.image,
              category: p.category,
              isAvailable: p.isAvailable !== false,
              orderCount: 5
            });
            if (trendingItems.length >= 15) break;
          }
        }
        if (trendingItems.length >= 15) break;
      }
    }

    res.json(trendingItems.slice(0, 15));
  } catch (err) {
    console.error('[store.trending] Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Global Search (Public) - searches stores and items
router.get('/global/search', async (req, res) => {
  try {
    const { q, locationId } = req.query;
    if (!q || !q.trim()) return res.json({ stores: [], dishes: [] });

    const queryLower = q.trim().toLowerCase();

    const where = { isHidden: false };
    if (locationId) {
      where.locationId = String(locationId);
    }

    const stores = await prisma.store.findMany({
      where,
      include: { admin: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    });

    const matchedStores = [];
    const matchedDishes = [];

    stores.forEach(store => {
      const storeName = (store.name || '').toLowerCase();
      const storeCat = (store.category || '').toLowerCase();

      if (storeName.includes(queryLower) || storeCat.includes(queryLower)) {
        matchedStores.push({
          _id: store.id,
          id: store.id,
          name: store.name,
          category: store.category,
          image: store.image,
          isOpen: store.isOpen,
          market: store.market,
          adminName: store.admin?.name
        });
      }
      
      const products = Array.isArray(store.products) ? store.products : [];
      const matchingProducts = products.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        return pName.includes(queryLower) || pCat.includes(queryLower) || pDesc.includes(queryLower);
      });

      if (matchingProducts.length > 0) {
        matchedDishes.push({
          _id: store.id,
          id: store.id,
          name: store.name,
          market: store.market,
          matchedProducts: matchingProducts.map(p => ({
            _id: p._id || p.id,
            id: p._id || p.id,
            name: p.name,
            price: p.price
          }))
        });
      }
    });

    res.json({ stores: matchedStores, dishes: matchedDishes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all stores (Public)
router.get('/all/list', async (req, res) => {
  try {
    const { locationId } = req.query;
    const storesWithRatings = await storeRepository.getAllStores({ locationId });
    res.json(storesWithRatings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all locations with available markets (Public/Authenticated)
router.get('/locations/list', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single store by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const store = await storeRepository.getStoreById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Image (Protected)
router.put('/:storeId/update-image', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const store = await prisma.store.findFirst({
      where: {
        id: req.params.storeId,
        ...(req.admin.role !== 'superadmin' && { adminId: String(adminId) })
      }
    });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'universe_stores' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        bufferToStream(req.file.buffer).pipe(stream);
      });

      const updated = await prisma.store.update({
        where: { id: store.id },
        data: { image: uploadResult.secure_url }
      });
      res.json(normalizeStore(updated));
    } else {
      res.status(400).json({ message: 'No image file provided' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Category Image (Protected)
router.put('/:storeId/category-image', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { categoryName } = req.body;
    if (!categoryName) return res.status(400).json({ message: 'Category name is required' });

    const adminId = req.admin.id || req.admin._id;
    const store = await prisma.store.findFirst({
      where: {
        id: req.params.storeId,
        ...(req.admin.role !== 'superadmin' && { adminId: String(adminId) })
      }
    });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    let newImageUrl = req.body.imageUrl;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'universe_categories' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        bufferToStream(req.file.buffer).pipe(stream);
      });
      newImageUrl = uploadResult.secure_url;
    }

    if (!newImageUrl) {
      return res.status(400).json({ message: 'No image file or URL provided' });
    }

    const categoryImages = Array.isArray(store.categoryImages) ? [...store.categoryImages] : [];
    const existingIdx = categoryImages.findIndex(c => c.categoryName === categoryName);
    if (existingIdx !== -1) {
      categoryImages[existingIdx].image = newImageUrl;
    } else {
      categoryImages.push({ categoryName, image: newImageUrl });
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { categoryImages }
    });

    res.json(normalizeStore(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a Product to Store
router.post('/:storeId/product', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, description, price, category, image, variants, isCombo, comboItems, freeItems, dietaryPreference } = req.body;
    let parsedVariants = [];
    if (variants) {
      try { parsedVariants = JSON.parse(variants); } catch (e) {}
    }
    let parsedComboItems = [];
    if (comboItems) {
      try { parsedComboItems = JSON.parse(comboItems); } catch(e) {}
    }
    let parsedFreeItems = [];
    if (freeItems) {
      try { parsedFreeItems = JSON.parse(freeItems); } catch(e) {}
    }
    
    let finalImage = image;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'universe_products' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        bufferToStream(req.file.buffer).pipe(stream);
      });
      finalImage = uploadResult.secure_url;
    }
    
    const adminId = req.admin.id || req.admin._id;

    // Check if stall is at a Pure Veg location
    const targetStore = await prisma.store.findUnique({
      where: { id: req.params.storeId },
      include: { location: true }
    });
    const isVegLocation = targetStore?.location?.dietaryType === 'veg' ||
      (targetStore?.location?.name && (targetStore.location.name.toLowerCase().includes('lpu') || targetStore.location.name.toLowerCase().includes('lovely'))) ||
      targetStore?.dietaryType === 'veg';

    if (isVegLocation && (dietaryPreference === 'non-veg' || (name && /(chicken|mutton|beef|pork|fish|prawn|meat)/i.test(name)))) {
      return res.status(400).json({ message: 'Non-veg items are strictly prohibited at this Pure Veg campus location.' });
    }

    const store = await storeRepository.addProduct(req.params.storeId, adminId, {
      name,
      description: description || '',
      price: Number(price) || 0,
      category: category || 'Uncategorized',
      image: finalImage,
      dietaryPreference: dietaryPreference || 'none',
      variants: parsedVariants,
      isCombo: isCombo === 'true' || isCombo === true,
      comboItems: parsedComboItems,
      freeItems: parsedFreeItems
    });

    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId || store._id || store.id);
      const payload = { storeId: sId, _id: sId, products: store.products, store };
      io.emit('store_menu_update', payload);
      io.to(sId).emit('store_menu_update', payload);
    }

    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Batch Add Products to Store
router.post('/:storeId/products/batch', auth, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products array is required' });
    }

    const adminId = req.admin.id || req.admin._id;

    // Check if stall is at a Pure Veg location
    const targetStore = await prisma.store.findUnique({
      where: { id: req.params.storeId },
      include: { location: true }
    });
    const isVegLocation = targetStore?.location?.dietaryType === 'veg' ||
      (targetStore?.location?.name && (targetStore.location.name.toLowerCase().includes('lpu') || targetStore.location.name.toLowerCase().includes('lovely'))) ||
      targetStore?.dietaryType === 'veg';

    const sanitizedProducts = products.map(item => {
      if (isVegLocation && (item.dietaryPreference === 'non-veg' || (item.name && /(chicken|mutton|beef|pork|fish|prawn|meat)/i.test(item.name)))) {
        return { ...item, dietaryPreference: 'veg' };
      }
      return item;
    });

    const store = await storeRepository.addProductsBatch(req.params.storeId, adminId, sanitizedProducts);
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId || store._id || store.id);
      const payload = { storeId: sId, _id: sId, products: store.products, store };
      io.emit('store_menu_update', payload);
      io.to(sId).emit('store_menu_update', payload);
    }

    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a Product (Protected)
router.delete('/:storeId/product/:productId', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const store = await storeRepository.deleteProduct(req.params.storeId, adminId, req.params.productId);
    if (!store) return res.status(404).json({ message: 'Product or store not found' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId || store._id || store.id);
      const payload = { storeId: sId, _id: sId, productId: req.params.productId, products: store.products, store };
      io.emit('store_menu_update', payload);
      io.to(sId).emit('store_menu_update', payload);
    }

    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Product Availability
router.put('/:storeId/product/:productId/toggle', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const isStaff = req.admin.role === 'staff' || req.admin.role === 'employee';
    if (isStaff && req.admin.storeId && String(req.admin.storeId) !== String(req.params.storeId)) {
      return res.status(403).json({ message: 'Unauthorized: Staff not assigned to this store' });
    }
    const effectiveAdminId = (isStaff || req.admin.role === 'superadmin') ? null : adminId;
    const result = await storeRepository.toggleProduct(req.params.storeId, effectiveAdminId, req.params.productId);
    if (!result) return res.status(404).json({ message: 'Product or store not found' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId);
      io.emit('product_availability_update', {
        storeId: sId,
        productId: req.params.productId,
        isAvailable: result.isAvailable
      });
      io.to(sId).emit('product_availability_update', {
        storeId: sId,
        productId: req.params.productId,
        isAvailable: result.isAvailable
      });
      const menuPayload = { storeId: sId, _id: sId, products: result.store?.products || [], store: result.store };
      io.emit('store_menu_update', menuPayload);
      io.to(sId).emit('store_menu_update', menuPayload);
    }

    res.json({ message: 'Product updated successfully', store: result.store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit a Product in Store
router.put('/:storeId/product/:productId', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, description, price, category, image, variants, isCombo, comboItems, freeItems, dietaryPreference } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (category) updateData.category = category;
    if (dietaryPreference) updateData.dietaryPreference = dietaryPreference;
    if (variants) {
      try { updateData.variants = JSON.parse(variants); } catch (e) {}
    }
    if (isCombo !== undefined) {
      updateData.isCombo = isCombo === 'true' || isCombo === true;
    }
    if (comboItems) {
      try { updateData.comboItems = JSON.parse(comboItems); } catch (e) {}
    }
    if (freeItems) {
      try { updateData.freeItems = JSON.parse(freeItems); } catch (e) {}
    }
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'universe_products' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        bufferToStream(req.file.buffer).pipe(stream);
      });
      updateData.image = uploadResult.secure_url;
    } else if (image !== undefined) {
      updateData.image = image;
    }

    const adminId = req.admin.id || req.admin._id;
    const store = await storeRepository.updateProduct(req.params.storeId, adminId, req.params.productId, updateData);
    if (!store) return res.status(404).json({ message: 'Product or store not found' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId || store._id || store.id);
      const payload = { storeId: sId, _id: sId, products: store.products, store };
      io.emit('store_menu_update', payload);
      io.to(sId).emit('store_menu_update', payload);
    }

    res.json({ message: 'Product updated successfully', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Store Open/Closed Status with Graceful Pending Orders Auto-Cancellation
router.put('/:storeId/toggle-status', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const storeId = req.params.storeId;
    const { forceCancelPending } = req.body || {};

    const currentStore = await prisma.store.findFirst({
      where: { id: storeId, ...(adminId ? { adminId } : {}) }
    });
    if (!currentStore) return res.status(404).json({ message: 'Store not found' });

    // If currently OPEN and turning OFF, check for pending orders
    const willClose = currentStore.isOpen;
    if (willClose) {
      const pendingOrders = await prisma.order.findMany({
        where: {
          storeId,
          status: 'Pending'
        },
        include: { store: true }
      });

      if (pendingOrders.length > 0 && !forceCancelPending) {
        return res.status(200).json({
          requiresConfirmation: true,
          pendingCount: pendingOrders.length,
          message: `You have ${pendingOrders.length} pending order(s) waiting for acceptance. Closing your stall will cancel and immediately refund them to students.`
        });
      }

      // If forceCancelPending is confirmed or 0 pending orders, cancel all pending orders
      if (pendingOrders.length > 0 && forceCancelPending) {
        const io = req.app.get('io');
        for (const order of pendingOrders) {
          await refundService.handleOrderCancellation({
            orderId: order.id,
            reason: 'Stall closed by vendor before acceptance',
            actorType: 'VENDOR',
            actorId: adminId,
            io
          }).catch(e => console.error(`[StoreToggle] Cancellation error for #${order.orderNumber}:`, e.message));

          if (io) {
            const normalized = normalizeOrder(order);
            io.to(order.storeId).emit('order_status_update', normalized);
            io.to(order.id).emit('order_status_update', normalized);
          }
        }
      }
    }

    const store = await storeRepository.toggleStatus(storeId, adminId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    telegramService.sendStatusAlert(store, store.isOpen).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.emit('store_status_update', { storeId: store._id || store.id, isOpen: store.isOpen });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json({ 
      message: `Store is now ${store.isOpen ? 'Open' : 'Closed'}`, 
      isOpen: store.isOpen, 
      isAutomated: store.isAutomated,
      requiresConfirmation: false 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Auto-Accept Orders Status
router.put('/:storeId/toggle-auto-accept', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const storeId = req.params.storeId;

    const store = await storeRepository.toggleAutoAccept(storeId, adminId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const io = req.app.get('io');
    if (io) {
      io.emit('store_auto_accept_update', { 
        storeId: store._id || store.id, 
        autoAcceptOrders: Boolean(store.autoAcceptOrders) 
      });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json({
      message: `Auto-accept orders is now ${store.autoAcceptOrders ? 'ON' : 'OFF'}`,
      autoAcceptOrders: Boolean(store.autoAcceptOrders),
      store
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Details
router.put('/:storeId/update-details', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const updatePayload = { ...req.body };

    // Strictly protect Location and Market: ONLY Super Admin can reassign campus location or market zone
    if (req.admin.role !== 'superadmin') {
      delete updatePayload.locationId;
      delete updatePayload.market;
    }

    let store = await storeRepository.updateStoreDetails(req.params.storeId, adminId, updatePayload);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // If automated mode is active or was toggled, instantly evaluate open/close status
    if (store.isAutomated) {
      const now = new Date();
      const currentHHMM = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      const op = store.openingTime || '10:00';
      const cl = store.closingTime || '22:00';
      const shouldBeOpen = op <= cl
        ? (currentHHMM >= op && currentHHMM < cl)
        : (currentHHMM >= op || currentHHMM < cl);

      if (store.isOpen !== shouldBeOpen) {
        store = await storeRepository.updateStoreDetails(req.params.storeId, adminId, { isOpen: shouldBeOpen });
      }
    }

    const io = req.app.get('io');
    if (io) {
      const sId = String(store._id || store.id);
      io.emit('store_status_update', { storeId: sId, isOpen: store.isOpen, isAutomated: store.isAutomated });
      io.emit('store_timing_update', {
        storeId: sId,
        openingTime: store.openingTime,
        closingTime: store.closingTime,
        isAutomated: store.isAutomated,
        isOpen: store.isOpen
      });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===================== STORE OFFERS & DEALS ROUTES =====================
const pricingEngine = require('../utils/pricingEngine');
const globalOfferRepository = require('../repositories/globalOfferRepository');

// 1. Get Store Offers (Combined with active platform-wide Global Offers)
router.get('/:storeId/offers', async (req, res) => {
  try {
    const [store, globalOffers] = await Promise.all([
      storeRepository.getStoreById(req.params.storeId),
      globalOfferRepository.getActive(req.params.storeId).catch(() => [])
    ]);

    const storeOffers = (store && Array.isArray(store.offers)) 
      ? store.offers.map(o => ({ ...o, isGlobal: false })) 
      : [];

    // Combine store offers and global offers
    const seenCodes = new Set();
    const combined = [];

    for (const off of [...storeOffers, ...globalOffers]) {
      const codeKey = (off.code || off.id || '').toUpperCase();
      if (codeKey && seenCodes.has(codeKey)) continue;
      if (codeKey) seenCodes.add(codeKey);
      combined.push(off);
    }

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Real-Time Pricing & Offer Evaluation (Public Cart preview endpoint)
router.post('/:storeId/calculate-pricing', async (req, res) => {
  try {
    const store = await storeRepository.getStoreById(req.params.storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const { items, orderType, selectedOfferId, couponCode, removeOffer } = req.body;
    const globalOffers = await globalOfferRepository.getActive(req.params.storeId).catch(() => []);
    
    const result = pricingEngine.calculateCartPricing(store, items, { 
      orderType, 
      selectedOfferId, 
      couponCode,
      removeOffer,
      globalOffers 
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Create a Store Offer (Protected)
router.post('/:storeId/offers', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const result = await storeRepository.createStoreOffer(req.params.storeId, adminId, req.body);
    if (!result) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
      io.to(sId).emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Update a Store Offer (Protected)
router.put('/:storeId/offers/:offerId', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const result = await storeRepository.updateStoreOffer(req.params.storeId, adminId, req.params.offerId, req.body);
    if (!result) return res.status(404).json({ message: 'Store or offer not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer });
      io.emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
      io.to(sId).emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Toggle a Store Offer ON/OFF (Protected)
router.put('/:storeId/offers/:offerId/toggle', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const result = await storeRepository.toggleStoreOffer(req.params.storeId, adminId, req.params.offerId);
    if (!result) return res.status(404).json({ message: 'Store or offer not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer, isToggled: true });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, updatedOffer: result.offer, isToggled: true });
      io.emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
      io.to(sId).emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Delete a Store Offer (Protected)
router.delete('/:storeId/offers/:offerId', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const result = await storeRepository.deleteStoreOffer(req.params.storeId, adminId, req.params.offerId);
    if (!result) return res.status(404).json({ message: 'Store or offer not found or unauthorized' });

    const io = req.app.get('io');
    if (io) {
      const sId = String(req.params.storeId);
      io.emit('store_offers_update', { storeId: sId, offers: result.offers, deletedOfferId: req.params.offerId });
      io.to(sId).emit('store_offers_update', { storeId: sId, offers: result.offers, deletedOfferId: req.params.offerId });
      io.emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
      io.to(sId).emit('store_menu_update', { storeId: sId, _id: sId, store: result.store });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

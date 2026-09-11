const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const storeRepository = require('../repositories/storeRepository');
const telegramService = require('../services/telegramService');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const Order = require('../models/Order');

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
    const { name, category, market, upiId, telegramChatId, locationId } = req.body;
    let finalMarket = market || 'BH1 Market';

    if (locationId) {
      const Location = require('../models/Location');
      const loc = await Location.findById(locationId).catch(() => null);
      if (loc && loc.type === 'External') {
        finalMarket = loc.name;
      }
    }

    const adminId = req.admin.id || req.admin._id;
    const savedStore = await storeRepository.createStore({
      adminId,
      name,
      category: category || 'General',
      market: finalMarket,
      locationId: locationId || null,
      upiId: upiId || '',
      telegramChatId: telegramChatId || ''
    });

    // Dual-write fallback to MongoDB in background
    new Store({
      _id: savedStore._id,
      admin: adminId,
      name,
      category: category || 'General',
      market: finalMarket,
      locationId: locationId || null,
      upiId: upiId || '',
      telegramChatId: telegramChatId || '',
      products: []
    }).save().catch(() => {});

    res.status(201).json(savedStore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's own stores (Multiple)
router.get('/my-stores', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
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
    let trendingItems = [];

    const pipeline = [
      { $match: { status: 'Completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', count: { $sum: '$items.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ];

    const topProductIds = await Order.aggregate(pipeline);

    // 2. Fetch the actual product details for these top product IDs in PARALLEL
    const storePromises = topProductIds.map(async (item) => {
      if (!item._id) return null;
      
      const store = await Store.findOne({
        'products._id': item._id,
        isHidden: false,
        name: { $ne: 'Hhh' },
        ...(locationId ? { locationId: locationId } : {})
      }, { 'products.$': 1, name: 1, market: 1, _id: 1, isOpen: 1 });

      if (store && store.products && store.products.length > 0) {
        const product = store.products[0];
        return {
          storeId: store._id,
          storeName: store.name,
          market: store.market,
          isOpen: store.isOpen,
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          isAvailable: product.isAvailable !== false, // default true
          orderCount: item.count
        };
      }
      return null;
    });

    const resolvedStores = await Promise.all(storePromises);
    trendingItems = resolvedStores.filter(item => item !== null);

    // 3. Fallback: If not enough real trending data, fill it up with items that have images
    if (trendingItems.length < 8) {
      const fallbackStores = await Store.aggregate([
        { $match: { isHidden: false, name: { $ne: 'Hhh' }, ...(locationId ? { locationId: mongoose.Types.ObjectId(locationId) } : {}) } },
        { $unwind: '$products' },
        { $match: { 'products.image': { $exists: true, $ne: '' } } },
        { $sample: { size: 10 } }
      ]);
      
      fallbackStores.forEach(fs => {
        // Only add if not already in trendingItems
        if (!trendingItems.some(ti => ti.productId.toString() === fs.products._id.toString())) {
          trendingItems.push({
            storeId: fs._id,
            storeName: fs.name,
            market: fs.market,
            isOpen: fs.isOpen !== false,
            productId: fs.products._id,
            name: fs.products.name,
            price: fs.products.price,
            image: fs.products.image,
            category: fs.products.category,
            isAvailable: fs.products.isAvailable !== false,
            orderCount: Math.floor(Math.random() * 20) + 5 // fake count for visual consistency
          });
        }
      });
    }

    res.json(trendingItems);
  } catch (err) {
    console.error('Trending items error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Global Search (Public) - searches stores and items
router.get('/global/search', async (req, res) => {
  try {
    const { q, locationId } = req.query;
    if (!q) return res.json({ stores: [], dishes: [] });

    // Escape special regex characters
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const filter = { isHidden: { $ne: true } };
    if (locationId) {
      filter.locationId = locationId;
    }

    const stores = await Store.find(filter, 'name category products _id isOpen image market priority')
      .populate('admin', 'name')
      .sort({ priority: 1, createdAt: -1 });
    const matchedStores = [];
    const matchedDishes = [];

    stores.forEach(store => {
       if (regex.test(store.name) || regex.test(store.category)) {
           matchedStores.push({
               _id: store._id,
               name: store.name,
               category: store.category,
               image: store.image,
               isOpen: store.isOpen,
               market: store.market,
               adminName: store.admin?.name
           });
       }
       
       const matchingProducts = store.products.filter(p => regex.test(p.name) || regex.test(p.category) || (p.description && regex.test(p.description)));
       if (matchingProducts.length > 0) {
           matchedDishes.push({
               _id: store._id,
               name: store.name,
               market: store.market,
               matchedProducts: matchingProducts.map(p => ({ name: p.name, price: p.price, _id: p._id }))
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
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
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
      store.image = uploadResult.secure_url;
      await store.save();
      res.json(store);
    } else {
      res.status(400).json({ message: 'No image file provided' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Image (Protected)
router.put('/:storeId/category-image', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { categoryName } = req.body;
    if (!categoryName) return res.status(400).json({ message: 'Category name is required' });

    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

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
      
      const existingIdx = store.categoryImages.findIndex(c => c.categoryName === categoryName);
      if (existingIdx !== -1) {
        store.categoryImages[existingIdx].image = uploadResult.secure_url;
      } else {
        store.categoryImages.push({ categoryName, image: uploadResult.secure_url });
      }
      
      await store.save();
      res.json(store);
    } else if (req.body.imageUrl) {
      const existingIdx = store.categoryImages.findIndex(c => c.categoryName === categoryName);
      if (existingIdx !== -1) {
        store.categoryImages[existingIdx].image = req.body.imageUrl;
      } else {
        store.categoryImages.push({ categoryName, image: req.body.imageUrl });
      }
      
      await store.save();
      res.json(store);
    } else {
      res.status(400).json({ message: 'No image file or URL provided' });
    }
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
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Product Availability
router.put('/:storeId/product/:productId/toggle', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const result = await storeRepository.toggleProduct(req.params.storeId, adminId, req.params.productId);
    if (!result) return res.status(404).json({ message: 'Product or store not found' });

    // Broadcast availability change globally (frontend filters by storeId)
    const io = req.app.get('io');
    if (io) {
      io.emit('product_availability_update', {
        storeId: req.params.storeId,
        productId: req.params.productId,
        isAvailable: result.isAvailable
      });
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

    res.json({ message: 'Product updated successfully', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Store Open/Closed Status
router.put('/:storeId/toggle-status', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const store = await storeRepository.toggleStatus(req.params.storeId, adminId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Notify via Telegram
    telegramService.sendStatusAlert(store, store.isOpen).catch(() => {});

    // Broadcast status change globally
    const io = req.app.get('io');
    if (io) {
      io.emit('store_status_update', { storeId: store._id || store.id, isOpen: store.isOpen });
      io.to('superadmin_room').emit('superadmin:store_update', store);
    }

    res.json({ message: `Store is now ${store.isOpen ? 'Open' : 'Closed'}`, isOpen: store.isOpen, isAutomated: store.isAutomated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Details
router.put('/:storeId/update-details', auth, async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const store = await storeRepository.updateStoreDetails(req.params.storeId, adminId, req.body);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

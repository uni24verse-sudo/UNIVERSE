const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const telegramService = require('../services/telegramService');
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
    const { name, category, market, upiId, telegramChatId, locationId } = req.body;

    let finalMarket = market || 'BH1 Market';
    
    // Automatically detect and align with external hubs if locationId is provided
    if (locationId) {
      const Location = require('../models/Location');
      const loc = await Location.findById(locationId);
      if (loc && loc.type === 'External') {
        finalMarket = loc.name; // e.g., "Law Gate" instead of campus markets
      }
    }

    const newStore = new Store({
      admin: req.admin._id,
      name,
      category: category || 'General',
      market: finalMarket,
      locationId: locationId || null,
      upiId: upiId || '',
      telegramChatId: telegramChatId || '',
      products: []
    });

    const savedStore = await newStore.save();
    res.status(201).json(savedStore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's own stores (Multiple)
router.get('/my-stores', auth, async (req, res) => {
  try {
    const stores = await Store.find({ admin: req.admin._id });
    
    // Fetch Order to calculate revenue for each store
    const Order = require('../models/Order');
    
    const storesWithBilling = await Promise.all(stores.map(async (store) => {
      const completedOrders = await Order.find({ store: store._id, status: 'Completed' });
      const revenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      let estimatedFees = 0;
      if (store.isTrialStarted && new Date() > new Date(store.trialEndDate)) {
          estimatedFees = revenue * 0.035;
      }

      return {
          ...store.toObject(),
          totalRevenue: revenue,
          estimatedFees: estimatedFees.toFixed(2),
          daysLeftInTrial: store.isTrialStarted ? 
              Math.max(0, Math.ceil((new Date(store.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null
      };
    }));

    res.json(storesWithBilling);
  } catch (err) {
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
    const filter = { isHidden: { $ne: true } };
    if (locationId) {
      filter.locationId = locationId;
    }

    const stores = await Store.find(
      filter, 
      'name market admin category isOpen image priority products._id locationId'
    )
      .populate('admin', 'name')
      .sort({ priority: 1, createdAt: -1 })
      .lean()
      .exec();

    const Order = require('../models/Order');
    const storesWithRatings = await Promise.all(stores.map(async (store) => {
      const completedOrdersCount = await Order.countDocuments({ store: store._id, status: 'Completed' });
      const cancelledOrdersCount = await Order.countDocuments({ store: store._id, status: 'Cancelled' });
      
      let rating = 5.0;
      const totalRatedOrders = completedOrdersCount + cancelledOrdersCount;
      if (totalRatedOrders > 0) {
        rating = 1.0 + 4.0 * (completedOrdersCount / totalRatedOrders);
      }
      
      return {
        ...store,
        rating: parseFloat(rating.toFixed(1)),
        completedOrdersCount,
        cancelledOrdersCount
      };
    }));

    storesWithRatings.sort((a, b) => {
      // 1. Primary: Number of Completed Orders (More completed first)
      if (b.completedOrdersCount !== a.completedOrdersCount) {
        return b.completedOrdersCount - a.completedOrdersCount;
      }

      // 2. Secondary: Number of Cancelled Orders (Fewer cancelled first)
      if (a.cancelledOrdersCount !== b.cancelledOrdersCount) {
        return a.cancelledOrdersCount - b.cancelledOrdersCount;
      }

      // 3. Tertiary: Open Status (Open stores first fallback)
      const aOpen = a.isOpen !== false;
      const bOpen = b.isOpen !== false;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;

      // 4. Quaternary: Rating (Higher rating first)
      if (b.rating !== a.rating) return b.rating - a.rating;

      return (a.priority || 0) - (b.priority || 0);
    });

    res.json(storesWithRatings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single store by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('admin', 'name')
      .populate('locationId', 'name type city');
    
    if (!store || store.isHidden) return res.status(404).json({ message: 'Store not found' });

    const storeObj = store.toObject();
    if (storeObj.admin) {
      storeObj.paymentStatus = {
        upiId: store.upiId || ''
      };
    }

    res.json(storeObj);
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
    
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    store.products.push({ 
      name, 
      description: description || '',
      price, 
      category: category || 'Uncategorized', 
      image: finalImage, 
      dietaryPreference: dietaryPreference || 'none',
      variants: parsedVariants,
      isCombo: isCombo === 'true' || isCombo === true,
      comboItems: parsedComboItems,
      freeItems: parsedFreeItems
    });
    await store.save();
    
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Batch Add Products (Protected)
router.post('/:storeId/products/batch', auth, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ message: 'Products must be an array' });

    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    products.forEach(p => {
      store.products.push({
        name: p.name,
        price: Number(p.price) || 0,
        category: p.category || 'General',
        image: '' // AI scan doesn't provide images yet
      });
    });

    await store.save();
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a Product (Protected)
router.delete('/:storeId/product/:productId', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const productIndex = store.products.findIndex(p => p._id.toString() === req.params.productId);
    if (productIndex === -1) return res.status(404).json({ message: 'Product not found' });

    store.products.splice(productIndex, 1);
    await store.save();
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Product Availability
router.put('/:storeId/product/:productId/toggle', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const product = store.products.id(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // If isAvailable remains undefined or null (old records), it behaves as true. Toggling should make it false.
    product.isAvailable = product.isAvailable === false ? true : false;
    store.markModified('products'); 
    await store.save();

    res.json({ message: 'Product updated successfully', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit a Product in Store
router.put('/:storeId/product/:productId', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, description, price, category, image, variants, isCombo, comboItems, freeItems, dietaryPreference } = req.body;
    
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const product = store.products.id(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category) product.category = category;
    if (dietaryPreference) product.dietaryPreference = dietaryPreference;
    if (variants) {
      try { product.variants = JSON.parse(variants); } catch (e) {}
    }
    if (isCombo !== undefined) {
      product.isCombo = isCombo === 'true' || isCombo === true;
    }
    if (comboItems) {
      try { product.comboItems = JSON.parse(comboItems); } catch (e) {}
    }
    if (freeItems) {
      try { product.freeItems = JSON.parse(freeItems); } catch (e) {}
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
      product.image = uploadResult.secure_url;
    } else if (image !== undefined) {
      product.image = image;
    }

    await store.save();
    
    res.json({ message: 'Product updated successfully', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Store Open/Closed Status
router.put('/:storeId/toggle-status', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    store.isOpen = !store.isOpen;
    // Manual toggle disables automation for this store
    store.isAutomated = false;
    await store.save();

    // Notify via Telegram
    await telegramService.sendStatusAlert(store, store.isOpen);

    // Broadcast status change globally
    const io = req.app.get('io');
    if (io) {
      io.emit('store_status_update', { storeId: store._id, isOpen: store.isOpen });
    }

    res.json({ message: `Store is now ${store.isOpen ? 'Open' : 'Closed'}`, isOpen: store.isOpen, isAutomated: store.isAutomated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Details
router.put('/:storeId/update-details', auth, async (req, res) => {
  try {
    const { name, category, packagingCharge, market, upiId, telegramChatId, telegramBotToken, openingTime, closingTime, isAutomated } = req.body;
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (name) store.name = name;
    if (category) store.category = category;
    if (packagingCharge !== undefined) store.packagingCharge = Number(packagingCharge);
    if (market) store.market = market;
    if (upiId !== undefined) store.upiId = upiId;
    if (telegramChatId !== undefined) store.telegramChatId = telegramChatId;
    if (telegramBotToken !== undefined) store.telegramBotToken = telegramBotToken;
    if (openingTime) store.openingTime = openingTime;
    if (closingTime) store.closingTime = closingTime;
    if (isAutomated !== undefined) store.isAutomated = isAutomated;
    if (req.body.accentColor !== undefined) store.accentColor = req.body.accentColor;
    
    await store.save();
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

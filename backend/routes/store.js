const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
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
    const { name, category } = req.body;

    const newStore = new Store({
      admin: req.admin._id,
      name,
      category: category || 'General',
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
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Global Search (Public) - searches stores and items
router.get('/global/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ stores: [], dishes: [] });

    const regex = new RegExp(q, 'i');

    const stores = await Store.find({}, 'name category products _id isOpen image').populate('admin', 'name');
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
               adminName: store.admin?.name
           });
       }
       store.products.forEach(p => {
           if (regex.test(p.name) || regex.test(p.category)) {
               matchedDishes.push({
                   _id: p._id,
                   name: p.name,
                   price: p.price,
                   category: p.category,
                   image: p.image,
                   storeId: store._id,
                   storeName: store.name,
                   isAvailable: p.isAvailable && store.isOpen
               });
           }
       });
    });

    res.json({ stores: matchedStores, dishes: matchedDishes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all stores (Public)
router.get('/all/list', async (req, res) => {
  try {
    const stores = await Store.find({}, 'name products admin category isOpen image').populate('admin', 'name').exec();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single store by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate('admin', 'name upiId');
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

// Add a Product to Store
router.post('/:storeId/product', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, price, category, image } = req.body;
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

    store.products.push({ name, price, category: category || 'Uncategorized', image: finalImage });
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

    product.isAvailable = !product.isAvailable;
    await store.save();

    res.json({ message: 'Product updated successfully', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit a Product in Store
router.put('/:storeId/product/:productId', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, price, category, image } = req.body;
    
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const product = store.products.id(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (name) product.name = name;
    if (price !== undefined) product.price = Number(price);
    if (category) product.category = category;
    
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
    await store.save();

    res.json({ message: `Store is now ${store.isOpen ? 'Open' : 'Closed'}`, isOpen: store.isOpen });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Details
router.put('/:storeId/update-details', auth, async (req, res) => {
  try {
    const { name, category, packagingCharge } = req.body;
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (name) store.name = name;
    if (category) store.category = category;
    if (packagingCharge !== undefined) store.packagingCharge = Number(packagingCharge);
    
    await store.save();
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

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
    
    const existingStore = await Store.findOne({ admin: req.admin._id });
    if (existingStore) return res.status(400).json({ message: 'Store already exists for this vendor' });

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

// Get Vendor's own store
router.get('/my-store', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
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
router.put('/update-image', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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
router.post('/product', auth, upload.single('imageFile'), async (req, res) => {
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
    
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    store.products.push({ name, price, category: category || 'Uncategorized', image: finalImage });
    await store.save();
    
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Batch Add Products (Protected)
router.post('/products/batch', auth, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ message: 'Products must be an array' });

    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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
router.delete('/product/:productId', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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
router.put('/product/:productId/toggle', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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
router.put('/product/:productId', auth, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, price, category, image } = req.body;
    
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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
router.put('/toggle-status', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    store.isOpen = !store.isOpen;
    await store.save();

    res.json({ message: `Store is now ${store.isOpen ? 'Open' : 'Closed'}`, isOpen: store.isOpen });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Store Details
router.put('/update-details', auth, async (req, res) => {
  try {
    const { name, category } = req.body;
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (name) store.name = name;
    if (category) store.category = category;
    
    await store.save();
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

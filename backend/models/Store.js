const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: 'Uncategorized' },
  image: { type: String },
  isAvailable: { type: Boolean, default: true },
  variants: [{
    name: { type: String, required: true },
    price: { type: Number, required: true }
  }]
});

const StoreSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  market: { type: String, default: 'BH1 Market' },
  image: { type: String },
  qrLink: { type: String },
  isOpen: { type: Boolean, default: true },
  packagingCharge: { type: Number, default: 0 },
  products: [ProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);

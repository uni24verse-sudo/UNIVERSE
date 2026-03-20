const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  isAvailable: { type: Boolean, default: true }
});

const StoreSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  name: { type: String, required: true },
  qrLink: { type: String },
  products: [ProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);

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
  }],
  isCombo: { type: Boolean, default: false },
  comboItems: [{
    name: { type: String, required: true },
    quantity: { type: String, required: true }
  }],
  freeItems: [{
    name: { type: String, required: true },
    quantity: { type: String, required: true }
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
  priority: { type: Number, default: 0 },
  isTrialStarted: { type: Boolean, default: false },
  trialStartDate: { type: Date },
  trialEndDate: { type: Date },
  fcmTokens: [{ type: String }], // Array to store FCM tokens for push notifications
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // Reference to store owner for FCM token management
  products: [ProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);

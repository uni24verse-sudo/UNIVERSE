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
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  image: { type: String },
  qrLink: { type: String },
  isOpen: { type: Boolean, default: true },
  openingTime: { type: String, default: '10:00' },
  closingTime: { type: String, default: '22:00' },
  isAutomated: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  packagingCharge: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  isTrialStarted: { type: Boolean, default: false },
  trialStartDate: { type: Date },
  trialEndDate: { type: Date },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'suspended'], 
    default: 'trial' 
  },
  commissionRate: { type: Number, default: 5 },
  upiId: { type: String, default: '' },
  telegramChatId: { type: String, default: '' },
  telegramBotToken: { type: String, default: '' },
  categoryImages: [{
    categoryName: { type: String, required: true },
    image: { type: String, required: true }
  }],
  products: [ProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);

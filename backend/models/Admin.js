const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  upiId: { type: String, default: '' },
  merchantUpiId: { type: String, default: '' }, // For business UPI ID
  upiType: { type: String, enum: ['personal', 'merchant'], default: 'personal' },
  bankName: { type: String, default: '' }, // Bank for merchant UPI
  businessName: { type: String, default: '' }, // Display name in UPI apps
  isUpiVerified: { type: Boolean, default: false }, // For payment verification
  upiDailyLimit: { type: Number, default: 100000 }, // Daily transaction limit in paise
  role: { type: String, enum: ['vendor', 'superadmin'], default: 'vendor' },
  isBanned: { type: Boolean, default: false },
  fcmToken: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);

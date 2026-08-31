const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['vendor', 'superadmin', 'staff'], default: 'vendor' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, 
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, 
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  permissions: { type: [String], default: ['VIEW_ACTIVE_ORDERS', 'UPDATE_ORDER_STATUS', 'MARK_ORDER_READY', 'VERIFY_PICKUP'] },
  lastLoginAt: { type: Date },
  isBanned: { type: Boolean, default: false },
  whatsappNumber: { type: String, default: '' },
  whatsappApiKey: { type: String, default: '' },
  telegramChatId: { type: String, default: '' },
  fcmToken: { type: String, default: '' },
  seenFeatures: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);

const mongoose = require('mongoose');

const DeviceRegistrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  deviceId: { type: String, required: true },
  pushToken: { type: String, required: true },
  platform: { type: String, enum: ['android', 'ios', 'web'], required: true },
  active: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure a device only has one active registration
DeviceRegistrySchema.index({ deviceId: 1 }, { unique: true });

module.exports = mongoose.model('DeviceRegistry', DeviceRegistrySchema);

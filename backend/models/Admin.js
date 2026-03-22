const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  upiId: { type: String, default: '' },
  role: { type: String, enum: ['vendor', 'superadmin'], default: 'vendor' },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);

const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  store: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    required: true 
  },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  totalRevenue: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'paid'], 
    default: 'pending' 
  },
  paidAt: { type: Date }
}, { timestamps: true });

// Ensure unique index for store per month/year
SettlementSchema.index({ store: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Settlement', SettlementSchema);

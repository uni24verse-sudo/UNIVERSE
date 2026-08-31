const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  store: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    required: true 
  },
  settlementType: { 
    type: String, 
    enum: ['daily', 'monthly'], 
    required: true 
  },
  // Used for display & historical grouping
  month: { type: Number, required: true }, 
  year: { type: Number, required: true },
  
  // Date range this settlement covers
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  totalRevenue: { type: Number, default: 0 },
  
  feesBreakdown: {
    gatewayFee: { type: Number, default: 0 },
    platformProfit: { type: Number, default: 0 },
    cancellationPenalty: { type: Number, default: 0 }
  },
  
  netPayable: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  
  utrNumber: { type: String }, // Provided when status -> completed
  paidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Settlement', SettlementSchema);

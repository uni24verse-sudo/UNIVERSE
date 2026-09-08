const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // Stable internal ID e.g. 'USR-8F72A91C'
  phone: { 
    type: String, 
    required: true, 
    index: true 
  }, // Primary authentication / contact handle
  email: { 
    type: String, 
    default: '', 
    trim: true, 
    lowercase: true 
  }, // Strictly optional
  currentName: { 
    type: String, 
    default: 'UniVerse Student' 
  }, // Current preferred display name
  campus: { 
    type: String, 
    default: 'Campus Food Court' 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Suspended', 'Flagged'], 
    default: 'Active' 
  },
  
  // Objective Aggregated Lifetime Metrics
  metrics: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    vendorRejectedOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalRefunded: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0 }
  },

  // Objective System Flags (e.g. repeated vendor rejections or payment retries)
  riskSignals: [{
    flagType: { type: String, required: true },
    reason: { type: String, required: true },
    detectedAt: { type: Date, default: Date.now }
  }],

  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);

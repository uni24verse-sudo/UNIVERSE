const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  refundId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // Razorpay rfnd_xxxxx or manual ref
  paymentId: { 
    type: String, 
    index: true 
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    ref: 'Customer',
    index: true 
  },
  customerName: { 
    type: String, 
    default: 'Student' 
  },
  customerPhone: { 
    type: String 
  },
  customerUpiId: { 
    type: String 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  idempotencyKey: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  reason: { 
    type: String, 
    default: 'Vendor rejected or kitchen timeout' 
  },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'CREATED', 'PROCESSED', 'FAILED'], 
    default: 'REQUESTED' 
  },
  mode: {
    type: String,
    enum: ['RAZORPAY_AUTO', 'MANUAL_OFFLINE', 'DIRECT_UPI'],
    default: 'DIRECT_UPI'
  },
  utr: { 
    type: String, 
    default: '' 
  },
  settledBy: { 
    type: String, 
    default: '' 
  },
  settledAt: { 
    type: Date 
  },
  processedAt: { 
    type: Date 
  },
  lockedBy: { 
    type: String, 
    default: '' 
  },
  lockedAt: { 
    type: Date 
  },
  lockExpiresAt: { 
    type: Date 
  },
  whatsappNotified: {
    type: Boolean,
    default: false
  },
  rawResponse: { 
    type: Object 
  }
}, { timestamps: true });

RefundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Refund', RefundSchema);

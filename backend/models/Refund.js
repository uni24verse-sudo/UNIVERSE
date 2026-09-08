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
    required: true,
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
    enum: ['RAZORPAY_AUTO', 'MANUAL_OFFLINE'],
    default: 'RAZORPAY_AUTO'
  },
  processedAt: { 
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

module.exports = mongoose.model('Refund', RefundSchema);

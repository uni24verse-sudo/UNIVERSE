const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // Razorpay pay_xxxxx
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
  currency: { 
    type: String, 
    default: 'INR' 
  },
  status: { 
    type: String, 
    enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED'], 
    default: 'CREATED' 
  },
  method: { 
    type: String, 
    default: 'upi' 
  },
  fee: { 
    type: Number, 
    default: 0 
  },
  tax: { 
    type: Number, 
    default: 0 
  },
  capturedAt: { 
    type: Date 
  },
  rawResponse: { 
    type: Object 
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);

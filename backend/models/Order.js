const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store.products' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  variant: { type: String },
  isCombo: { type: Boolean, default: false },
  comboItems: [{ name: String, quantity: String }],
  freeItems: [{ name: String, quantity: String }]
});

const OrderSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  orderNumber: { type: String, required: true },
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Razorpay', 'UPI'], default: 'Razorpay' },
  status: { 
    type: String, 
    enum: ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready', 'Completed', 'Cancelled'], 
    default: 'Payment Pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Failed'], 
    default: 'Pending' 
  },
  orderType: { type: String, enum: ['Dine In', 'Take Away'], default: 'Dine In' },
  packagingChargeApplied: { type: Number, default: 0 },

  // Customer Identity & Historical Snapshot
  userId: { type: String, ref: 'Customer', index: true }, // Stable customer account ID (e.g. USR-XXXXX)
  customerPhone: { type: String, required: true, index: true }, // Snapshot phone at checkout
  customerName: { type: String, default: 'UniVerse Student' }, // Snapshot name at checkout
  customerEmail: { type: String, default: '' }, // Optional snapshot email at checkout

  // Financial & Payment Gateway Tracking
  transactionId: { type: String, unique: true, sparse: true }, // Razorpay pay_xxxxx
  paymentProvider: { type: String, default: 'Razorpay' },
  
  // Refund Tracking
  refundId: { type: String }, // Razorpay rfnd_xxxxx or manual ref
  refundAmount: { type: Number, default: 0 },
  refundStatus: { 
    type: String, 
    enum: ['None', 'Requested', 'Initiated', 'Processed', 'Failed'], 
    default: 'None' 
  },
  refundIdempotencyKey: { type: String, unique: true, sparse: true },
  cancellationReason: { type: String },
  cancelledBy: { 
    actorType: { type: String, enum: ['VENDOR_STAFF', 'SYSTEM', 'SUPER_ADMIN'] },
    actorId: { type: String }
  },

  acceptDeadline: { type: Date },
  handoverToken: { type: String, select: false },
  handoverTokenExpiresAt: { type: Date },
  handoverTokenUsedAt: { type: Date },
  isPreOrder: { type: Boolean, default: false },
  scheduledTime: { type: String },
  reminderSent: { type: Boolean, default: false },
  reminder15Sent: { type: Boolean, default: false },
  reminder10Sent: { type: Boolean, default: false },
  
  // Finance Payout & Settlement
  isSettled: { type: Boolean, default: false },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);

const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
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
  status: { type: String, enum: ['Payment Pending', 'Pending', 'Confirmed', 'Ready', 'Completed', 'Cancelled'], default: 'Payment Pending' },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Failed'], 
    default: 'Pending' 
  },
  orderType: { type: String, enum: ['Dine In', 'Take Away'], default: 'Dine In' },
  packagingChargeApplied: { type: Number, default: 0 },
  customerPhone: { type: String },
  customerName: { type: String },
  transactionId: { type: String, unique: true, sparse: true },
  paymentProvider: { type: String, default: 'Razorpay' },
  acceptDeadline: { type: Date },
  handoverToken: { type: String },
  isPreOrder: { type: Boolean, default: false },
  scheduledTime: { type: String },
  reminderSent: { type: Boolean, default: false },
  reminder15Sent: { type: Boolean, default: false },
  reminder10Sent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);

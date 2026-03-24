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
  paymentMethod: { type: String, enum: ['Cash', 'UPI'], required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Verification Requested', 'Confirmed', 'Refund Requested', 'Refunded'], 
    default: 'Pending' 
  },
  orderType: { type: String, enum: ['Dine In', 'Take Away'], default: 'Dine In' },
  packagingChargeApplied: { type: Number, default: 0 },
  customerPhone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);

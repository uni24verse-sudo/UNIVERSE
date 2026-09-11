const mongoose = require('mongoose');

const OrderEventSchema = new mongoose.Schema({
  eventId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // e.g. evt_xxxx
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    index: true 
  },
  orderNumber: { 
    type: String 
  },
  userId: { 
    type: String, 
    ref: 'Customer',
    index: true 
  },
  actorType: { 
    type: String, 
    enum: ['CUSTOMER', 'VENDOR_STAFF', 'SUPER_ADMIN', 'RAZORPAY_WEBHOOK', 'SYSTEM'], 
    required: true 
  },
  actorId: { 
    type: String, 
    default: 'SYSTEM' 
  },
  eventType: { 
    type: String, 
    enum: [
      'ORDER_CREATED', 
      'PAYMENT_AUTHORIZED', 
      'PAYMENT_CAPTURED', 
      'ORDER_ACCEPTED', 
      'ORDER_COOKING', 
      'ORDER_READY', 
      'ORDER_COMPLETED', 
      'VENDOR_REJECTED', 
      'VENDOR_TIMEOUT', 
      'REFUND_INITIATED', 
      'REFUND_PROCESSED', 
      'REFUND_FAILED', 
      'ADMIN_NOTE_ADDED'
    ], 
    required: true 
  },
  oldStatus: { 
    type: String 
  },
  newStatus: { 
    type: String 
  },
  metadata: { 
    type: Object, 
    default: {} 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  }
}, { timestamps: false });

OrderEventSchema.post('save', function(doc) {
  try {
    const { syncOrderEvent } = require('../services/pgSyncService');
    syncOrderEvent(doc).catch(() => {});
  } catch (e) {}
});

module.exports = mongoose.model('OrderEvent', OrderEventSchema);

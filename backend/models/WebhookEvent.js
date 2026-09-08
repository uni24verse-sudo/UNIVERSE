const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema({
  eventId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // x-razorpay-event-id
  provider: { 
    type: String, 
    default: 'Razorpay' 
  },
  eventType: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['RECEIVED', 'PROCESSED', 'IGNORED_DUPLICATE', 'FAILED'], 
    default: 'RECEIVED' 
  },
  payloadHash: { 
    type: String 
  },
  receivedAt: { 
    type: Date, 
    default: Date.now 
  },
  processedAt: { 
    type: Date 
  }
}, { timestamps: true });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);

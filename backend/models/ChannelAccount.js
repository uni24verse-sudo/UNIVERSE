const mongoose = require('mongoose');

const ChannelAccountSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['whatsapp', 'email'],
    required: true
  },
  // For WhatsApp Baileys Multi-Device (Slots 1 to 5)
  slotIndex: {
    type: Number, // 1 to 5
    min: 1,
    max: 5,
    default: null
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
    default: 'Channel Account'
  },
  // WhatsApp specific metadata
  phoneNumber: {
    type: String,
    default: ''
  },
  pushName: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    default: 'WhatsApp Multi-Device'
  },
  sessionPath: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['connected', 'pairing', 'disconnected', 'empty', 'error'],
    default: 'empty'
  },
  lastActive: {
    type: Date,
    default: null
  },
  // For Email SMTP Senders
  emailConfig: {
    senderLabel: { type: String, default: '' },
    fromEmail: { type: String, default: '' },
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' }, // 16-char app password
    isVerified: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce compound uniqueness for WhatsApp slots so slotIndex 1..5 cannot be duplicated
ChannelAccountSchema.index({ type: 1, slotIndex: 1 }, { unique: true, partialFilterExpression: { slotIndex: { $exists: true, $ne: null } } });

module.exports = mongoose.model('ChannelAccount', ChannelAccountSchema);

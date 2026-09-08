const mongoose = require('mongoose');

const MasterTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'email'],
    required: true
  },
  category: {
    type: String,
    enum: ['Marketing & Offers', 'Order Lifecycle', 'Campus Announcements', 'Student Onboarding', 'Vendor Alerts', 'General'],
    default: 'Marketing & Offers'
  },
  // WhatsApp specific fields
  headerType: {
    type: String,
    enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
    default: 'NONE'
  },
  headerMediaUrl: {
    type: String,
    default: ''
  },
  headerText: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    required: true
  },
  footer: {
    type: String,
    default: 'UniVerse • Smart Campus Ordering'
  },
  buttons: [
    {
      type: {
        type: String,
        enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'],
        default: 'QUICK_REPLY'
      },
      text: { type: String, required: true },
      value: { type: String, default: '' } // URL or Phone number
    }
  ],
  // Email specific fields
  subject: {
    type: String,
    default: ''
  },
  emailPreheader: {
    type: String,
    default: ''
  },
  emailHeroImageUrl: {
    type: String,
    default: ''
  },
  emailCtaText: {
    type: String,
    default: 'Open UniVerse'
  },
  emailCtaUrl: {
    type: String,
    default: 'https://www.universeorder.co.in'
  },
  // Common
  variables: [{
    type: String // e.g. ['name', 'campus', 'store_name', 'order_id', 'discount_code']
  }],
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Archived'],
    default: 'Active'
  },
  createdBy: {
    type: String,
    default: 'SuperAdmin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MasterTemplate', MasterTemplateSchema);

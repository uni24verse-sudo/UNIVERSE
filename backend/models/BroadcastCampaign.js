const mongoose = require('mongoose');

const BroadcastCampaignSchema = new mongoose.Schema({
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
  channelAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelAccount',
    required: true
  },
  masterTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterTemplate',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['All Students', 'All Vendors', 'Campus Zone Users', 'Inactive Users (7+ days)', 'Specific Phone Numbers / Custom'],
    default: 'All Students'
  },
  customFilters: {
    locationId: { type: String, default: null },
    customNumbers: [{ type: String }],
    customEmails: [{ type: String }]
  },
  stats: {
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 }
  },
    status: {
    type: String,
    enum: ['Draft', 'Queued', 'In-Progress', 'Completed', 'Failed', 'Cancelled'],
    default: 'Draft'
  },
  lastError: { type: String, default: null },
  logs: [{
    recipient: { type: String },
    status: { type: String },
    error: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BroadcastCampaign', BroadcastCampaignSchema);

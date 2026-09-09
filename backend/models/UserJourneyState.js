const mongoose = require('mongoose');

const UserJourneyStateSchema = new mongoose.Schema({
  journeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journey',
    required: true
  },
  userId: {
    type: String, // String ID for compatibility with Postgres / Mongo
    default: null
  },
  userType: {
    type: String,
    enum: ['Student', 'Vendor'],
    default: 'Student'
  },
  name: { type: String, default: 'Student' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  currentNodeId: { type: String, required: true },
  scheduledExecutionTime: {
    type: Date,
    default: Date.now
  },
  history: [{
    nodeId: String,
    action: String,
    channelAccountId: mongoose.Schema.Types.ObjectId,
    status: String,
    recipient: String,
    renderedBody: String,
    slotIndex: Number,
    executedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['Pending', 'Waiting_Event', 'Completed', 'Failed', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
});

UserJourneyStateSchema.index({ journeyId: 1, phone: 1, status: 1 });
UserJourneyStateSchema.index({ scheduledExecutionTime: 1, status: 1 });
UserJourneyStateSchema.index({ 'metadata.orderId': 1, status: 1 });

module.exports = mongoose.model('UserJourneyState', UserJourneyStateSchema);

const mongoose = require('mongoose');

const JourneyNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['trigger', 'delay', 'condition', 'action', 'wait_event', 'webhook', 'tag'],
    required: true
  },
  label: { type: String, default: 'Step Node' },
  // Node specific config - Flexible Mixed type to store all granular custom configurations
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  // Flow connections
  nextNodeId: { type: String, default: null },
  trueNodeId: { type: String, default: null }, // for condition / accepted branch
  falseNodeId: { type: String, default: null } // for condition / rejected branch
}, { _id: false, strict: false });

const JourneySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  triggerType: {
    type: String,
    enum: [
      'Order Placed',
      'Order Accepted',
      'Order Ready',
      'Order Completed',
      'First Lifetime Order',
      'Repeat Order Placed',
      'Order Cancelled',
      'Refund Settled',
      'Inactive for 7 Days',
      'Manual Enrollment'
    ],
    required: true
  },
  nodes: [JourneyNodeSchema],
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Archived'],
    default: 'Draft'
  },
  totalEnrolled: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Journey', JourneySchema);

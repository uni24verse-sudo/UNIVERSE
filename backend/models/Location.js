const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true 
  },
  type: { 
    type: String, 
    enum: ['College', 'External'], 
    required: true 
  },
  city: { 
    type: String,
    default: ''
  },
  isHidden: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Location', LocationSchema);

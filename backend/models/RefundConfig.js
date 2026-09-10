const mongoose = require('mongoose');

const RefundConfigSchema = new mongoose.Schema({
  groupJid: { 
    type: String, 
    default: '' 
  }, // e.g. 120363xxxxxx@g.us
  groupName: { 
    type: String, 
    default: '' 
  },
  phoneNumbers: [{ 
    type: String 
  }], // e.g. ['7985397373', '8295886832']
  notifyGroup: { 
    type: Boolean, 
    default: true 
  },
  notifyPhones: { 
    type: Boolean, 
    default: true 
  },
  updatedBy: { 
    type: String, 
    default: 'SUPER_ADMIN' 
  }
}, { timestamps: true });

module.exports = mongoose.model('RefundConfig', RefundConfigSchema);

const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  username: {
    type: String
  },
  platformUserId: {
    type: String,
    sparse: true,
    unique: true
  },
  platform: {
    type: String,
    default: 'instagram'
  },
  name: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  city: {
    type: String
  },
  source: {
    type: String,
    enum: ['comment', 'dm', 'mention', 'manual', 'other'],
    default: 'dm'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['normal', 'hot', 'super'],
    default: 'normal'
  },
  tags: [{
    type: String
  }],
  notes: {
    type: String
  },
  activePathId: {
    type: String
  },
  activePathStepIndex: {
    type: Number,
    default: 0
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);

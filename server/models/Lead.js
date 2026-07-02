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
    enum: ['New', 'Not Picking', 'Contacted', 'Following Up', 'Payment Pending', 'Won', 'Lost', 'On Hold', 'Future City', 'Not Contacted', 'Interested', 'Rejected', 'Future City Lead', 'new', 'contacted', 'qualified', 'converted', 'lost'],
    default: 'New'
  },
  priority: {
    type: String,
    enum: ['normal', 'hot', 'super'],
    default: 'normal'
  },
  tags: [{
    type: String
  }],
  notes: [{
    text: String,
    status: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isPipelineLead: {
    type: Boolean,
    default: false
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

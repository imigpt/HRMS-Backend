const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: [{
    type: String,
    required: true
  }],
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'bulk', 'role-based', 'trigger', 'test'],
    default: 'individual'
  },
  targetRole: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'queued'],
    default: 'queued'
  },
  error: {
    type: String,
    default: null
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

emailLogSchema.index({ status: 1 });
emailLogSchema.index({ sentBy: 1 });
emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);

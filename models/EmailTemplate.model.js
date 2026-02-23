const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['company', 'employee'],
    default: 'company'
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

emailTemplateSchema.index({ slug: 1 }, { unique: true });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ type: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);

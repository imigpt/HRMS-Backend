const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'company',
      'attendance',
      'hrm',
      'payroll',
      'email',
      'storage',
      'localization',
      'appearance',
      'general'
    ],
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

systemSettingsSchema.index({ category: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

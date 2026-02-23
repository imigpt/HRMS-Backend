const mongoose = require('mongoose');

const permissionModuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

permissionModuleSchema.index({ name: 1 }, { unique: true });
permissionModuleSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('PermissionModule', permissionModuleSchema);

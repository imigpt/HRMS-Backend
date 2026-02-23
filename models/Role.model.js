const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  module: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  actions: {
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  }
}, { _id: false });

const roleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
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
  permissions: [permissionSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

roleSchema.index({ roleName: 1 }, { unique: true });
roleSchema.index({ status: 1 });

module.exports = mongoose.model('Role', roleSchema);

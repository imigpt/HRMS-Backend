const mongoose = require('mongoose');

const employeeIDConfigSchema = new mongoose.Schema({
  prefix: {
    type: String,
    required: true,
    default: 'EMP',
    trim: true
  },
  nextNumber: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  padding: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  separator: {
    type: String,
    default: '',
    enum: ['', '-', '_', '/']
  },
  includeYear: {
    type: Boolean,
    default: false
  },
  formatRule: {
    type: String,
    default: 'auto',
    enum: ['auto', 'manual', 'both']
  },
  manualOverrideAllowed: {
    type: Boolean,
    default: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate next employee ID based on config
employeeIDConfigSchema.methods.generateNextId = function() {
  const year = this.includeYear ? new Date().getFullYear().toString() : '';
  const num = String(this.nextNumber).padStart(this.padding, '0');
  const parts = [this.prefix, year, num].filter(Boolean);
  return parts.join(this.separator);
};

module.exports = mongoose.model('EmployeeIDConfig', employeeIDConfigSchema);

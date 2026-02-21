const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }
}, { _id: true });

const deductionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }
}, { _id: true });

const employeeSalarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  },
  salaryGroup: {
    type: String,
    trim: true,
    default: 'Default'
  },
  basicSalary: {
    type: Number,
    required: true,
    min: [0, 'Basic salary must be positive']
  },
  allowances: [allowanceSchema],
  deductions: [deductionSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual: total allowances
employeeSalarySchema.virtual('totalAllowances').get(function () {
  return this.allowances.reduce((sum, a) => {
    if (a.type === 'percentage') return sum + (this.basicSalary * a.amount / 100);
    return sum + a.amount;
  }, 0);
});

// Virtual: total deductions
employeeSalarySchema.virtual('totalDeductions').get(function () {
  return this.deductions.reduce((sum, d) => {
    if (d.type === 'percentage') return sum + (this.basicSalary * d.amount / 100);
    return sum + d.amount;
  }, 0);
});

// Virtual: net salary
employeeSalarySchema.virtual('netSalary').get(function () {
  return this.basicSalary + this.totalAllowances - this.totalDeductions;
});

employeeSalarySchema.set('toJSON', { virtuals: true });
employeeSalarySchema.set('toObject', { virtuals: true });

employeeSalarySchema.index({ user: 1, status: 1 });
employeeSalarySchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('EmployeeSalary', employeeSalarySchema);

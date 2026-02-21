const mongoose = require('mongoose');

const payrollAllowanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const payrollDeductionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const payrollSchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  allowances: [payrollAllowanceSchema],
  deductions: [payrollDeductionSchema],
  prePaymentDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  grossSalary: {
    type: Number,
    required: true,
    min: 0
  },
  totalDeductions: {
    type: Number,
    required: true,
    min: 0
  },
  netSalary: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['generated', 'paid', 'pending'],
    default: 'generated'
  },
  notes: {
    type: String,
    trim: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Unique payroll per user per month per year
payrollSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ company: 1, month: 1, year: 1 });
payrollSchema.index({ status: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);

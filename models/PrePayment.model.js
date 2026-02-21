const mongoose = require('mongoose');

const prePaymentSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  bankDetails: {
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true }
  },
  deductMonth: {
    type: String,
    required: true // Format: 'YYYY-MM'
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'deducted', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

prePaymentSchema.index({ user: 1, deductMonth: 1 });
prePaymentSchema.index({ company: 1 });

module.exports = mongoose.model('PrePayment', prePaymentSchema);

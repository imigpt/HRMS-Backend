const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    paid: {
      type: Number,
      default: 0,
      min: 0,
    },
    sick: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Track consumed leaves (approved leaves deducted)
    usedPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedSick: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedUnpaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// One balance record per user
leaveBalanceSchema.index({ user: 1 }, { unique: true });
leaveBalanceSchema.index({ company: 1 });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);

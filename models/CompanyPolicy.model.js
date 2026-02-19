const mongoose = require('mongoose');

const companyPolicySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Head Office',
      trim: true,
    },
    file: {
      url: { type: String },
      publicId: { type: String },
      originalName: { type: String },
      mimeType: { type: String },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

companyPolicySchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('CompanyPolicy', companyPolicySchema);

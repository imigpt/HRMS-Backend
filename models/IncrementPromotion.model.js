const mongoose = require('mongoose');

const incrementPromotionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['increment', 'promotion', 'increment-promotion', 'decrement', 'decrement-demotion'],
    required: true
  },
  currentDesignation: {
    type: String,
    required: true,
    trim: true
  },
  newDesignation: {
    type: String,
    trim: true
  },
  previousCTC: {
    type: Number,
    min: 0
  },
  newCTC: {
    type: Number,
    min: 0
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  description: {
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

incrementPromotionSchema.index({ user: 1, effectiveDate: -1 });
incrementPromotionSchema.index({ company: 1, type: 1 });

module.exports = mongoose.model('IncrementPromotion', incrementPromotionSchema);

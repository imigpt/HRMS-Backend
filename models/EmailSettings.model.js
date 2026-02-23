const mongoose = require('mongoose');

const emailSettingsSchema = new mongoose.Schema({
  mailDriver: {
    type: String,
    default: 'smtp',
    enum: ['smtp', 'sendgrid', 'ses', 'mailgun']
  },
  smtpHost: {
    type: String,
    default: 'smtp.gmail.com'
  },
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpUsername: {
    type: String,
    default: ''
  },
  smtpPassword: {
    type: String,
    default: '',
    select: false
  },
  encryption: {
    type: String,
    default: 'tls',
    enum: ['none', 'ssl', 'tls']
  },
  fromName: {
    type: String,
    default: 'HRMS'
  },
  fromEmail: {
    type: String,
    default: 'noreply@hrms.com'
  },
  // Email trigger settings
  triggers: {
    leaveApplication: { type: Boolean, default: true },
    leaveApproval: { type: Boolean, default: true },
    leaveRejection: { type: Boolean, default: true },
    attendanceCheckIn: { type: Boolean, default: false },
    attendanceCheckOut: { type: Boolean, default: false },
    attendanceLateArrival: { type: Boolean, default: true },
    taskAssignment: { type: Boolean, default: true },
    taskCompletion: { type: Boolean, default: false },
    expenseSubmission: { type: Boolean, default: true },
    expenseApproval: { type: Boolean, default: true },
    resignation: { type: Boolean, default: true },
    complaint: { type: Boolean, default: true },
    announcement: { type: Boolean, default: true },
    passwordReset: { type: Boolean, default: true },
    welcomeEmail: { type: Boolean, default: true },
    payslipGenerated: { type: Boolean, default: true }
  },
  // API keys for third party providers
  sendgridApiKey: {
    type: String,
    default: '',
    select: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailSettings', emailSettingsSchema);

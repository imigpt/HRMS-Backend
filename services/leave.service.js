/**
 * LEAVE SERVICE - Business logic for leave management
 * 
 * WHY: Handles leave balance calculations, deductions, restorations,
 * and complex leave approval workflows. Ensures data integrity.
 */

const Leave = require('../models/Leave.model');
const User = require('../models/User.model');
const LeaveBalance = require('../models/LeaveBalance.model');
const { 
  LEAVE_STATUS, 
  LEAVE_TYPES, 
  ERROR_MESSAGES,
  ROLES
} = require('../constants');

/**
 * Map leave type to the LeaveBalance field name
 */
const getBalanceField = (leaveType) => {
  const map = { paid: 'paid', sick: 'sick', unpaid: 'unpaid' };
  return map[leaveType] || null;
};
const getUsedField = (leaveType) => {
  const map = { paid: 'usedPaid', sick: 'usedSick', unpaid: 'usedUnpaid' };
  return map[leaveType] || null;
};

/**
 * Check for overlapping leave requests
 */
const hasOverlappingLeave = async (userId, startDate, endDate, excludeLeaveId = null) => {
  const query = {
    user: userId,
    status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
    $or: [
      // New leave starts during existing leave
      {
        startDate: { $lte: new Date(startDate) },
        endDate: { $gte: new Date(startDate) }
      },
      // New leave ends during existing leave
      {
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(endDate) }
      },
      // New leave completely contains existing leave
      {
        startDate: { $gte: new Date(startDate) },
        endDate: { $lte: new Date(endDate) }
      }
    ]
  };
  
  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }
  
  const overlapping = await Leave.findOne(query);
  return overlapping;
};

/**
 * Calculate number of days between dates (excluding weekends)
 */
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let days = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday = 1 to Friday = 5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
};

/**
 * Check if user has sufficient leave balance from LeaveBalance model
 */
const checkLeaveBalance = async (userId, leaveType, days) => {
  const field = getBalanceField(leaveType);
  if (!field) throw new Error('Invalid leave type');

  // Unpaid leave is always permitted (no balance limit)
  if (leaveType === 'unpaid') return true;

  const balance = await LeaveBalance.findOne({ user: userId }).lean();
  if (!balance) {
    // No balance record yet – block paid/sick leave until admin assigns balance
    return false;
  }

  const usedField = getUsedField(leaveType);
  const assigned = balance[field] || 0;
  const used = balance[usedField] || 0;
  const remaining = assigned - used;

  if (remaining < days) {
    return false;
  }
  return true;
};

/**
 * Deduct leave balance from LeaveBalance model
 */
const deductLeaveBalance = async (userId, leaveType, days) => {
  const usedField = getUsedField(leaveType);
  if (!usedField) return;

  await LeaveBalance.findOneAndUpdate(
    { user: userId },
    { $inc: { [usedField]: days } }
  );
};

/**
 * Restore leave balance in LeaveBalance model
 */
const restoreLeaveBalance = async (userId, leaveType, days) => {
  const usedField = getUsedField(leaveType);
  if (!usedField) return;

  await LeaveBalance.findOneAndUpdate(
    { user: userId },
    { $inc: { [usedField]: -days } }
  );
};

/**
 * Check for half-day conflicts:
 * - Any approved/pending full-day leave on this date
 * - Any approved/pending half-day leave on same date + same session
 */
const hasHalfDayConflict = async (userId, date, session) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const conflict = await Leave.findOne({
    user: userId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      // Full-day leave covering this date
      {
        isHalfDay: { $ne: true },
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
      },
      // Another half-day on the same date & same session
      {
        isHalfDay: true,
        session: session,
        startDate: { $gte: dayStart, $lte: dayEnd }
      }
    ]
  });
  return conflict;
};

/**
 * Create half-day leave request (0.5 day deduction)
 */
const createHalfDayLeaveRequest = async (userId, companyId, leaveData) => {
  const { leaveType, date, session, reason, attachments } = leaveData;

  // Check for conflicts
  const conflict = await hasHalfDayConflict(userId, date, session);
  if (conflict) {
    throw new Error(
      conflict.isHalfDay
        ? 'A half-day leave already exists for this date and session'
        : 'A full-day leave already exists on this date'
    );
  }

  // Check if user has at least 0.5 days balance
  const hasBalance = await checkLeaveBalance(userId, leaveType, 0.5);
  if (!hasBalance) {
    // Provide a specific message for unpaid (should never reach here),
    // and for paid/sick give a helpful message.
    throw new Error(
      leaveType === 'unpaid'
        ? 'Unpaid leave request failed unexpectedly'
        : `Insufficient ${leaveType} leave balance for a half-day request. Contact your admin to assign leave balance.`
    );
  }

  const leaveDate = new Date(date);
  leaveDate.setHours(0, 0, 0, 0);

  const leave = await Leave.create({
    user: userId,
    company: companyId,
    leaveType,
    isHalfDay: true,
    session,
    startDate: leaveDate,
    endDate: leaveDate,
    days: 0.5,
    reason,
    attachments: attachments || [],
    status: 'pending'
  });

  return leave;
};

/**
 * Create leave request
 */
const createLeaveRequest = async (userId, companyId, leaveData) => {
  const { leaveType, startDate, endDate, reason, attachments } = leaveData;
  
  // Validate dates
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error(ERROR_MESSAGES.INVALID_DATE_RANGE);
  }
  
  // Calculate days
  const days = calculateLeaveDays(startDate, endDate);
  
  if (days === 0) {
    throw new Error('Leave must be at least 1 working day');
  }
  
  // Check for overlapping leaves
  const overlapping = await hasOverlappingLeave(userId, startDate, endDate);
  if (overlapping) {
    throw new Error(ERROR_MESSAGES.OVERLAPPING_LEAVE);
  }
  
  // Check balance
  const hasBalance = await checkLeaveBalance(userId, leaveType, days);
  if (!hasBalance) {
    throw new Error(ERROR_MESSAGES.INSUFFICIENT_BALANCE);
  }
  
  // Create leave request
  const leave = await Leave.create({
    user: userId,
    company: companyId,
    leaveType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    days,
    reason,
    attachments: attachments || [],
    status: LEAVE_STATUS.PENDING
  });
  
  return leave;
};

/**
 * Approve leave request
 */
const approveLeave = async (leaveId, reviewerId, reviewNote) => {
  const leave = await Leave.findById(leaveId).populate('user');
  
  if (!leave) {
    throw new Error('Leave request not found');
  }
  
  if (leave.status !== LEAVE_STATUS.PENDING) {
    throw new Error(ERROR_MESSAGES.INVALID_STATUS_TRANSITION);
  }
  
  // Deduct leave balance
  await deductLeaveBalance(leave.user._id, leave.leaveType, leave.days);
  
  // Update leave record
  leave.status = LEAVE_STATUS.APPROVED;
  leave.reviewedBy = reviewerId;
  leave.reviewedAt = new Date();
  leave.reviewNote = reviewNote;
  leave.balanceDeducted = leave.days;
  
  await leave.save();
  
  // Update user status if leave starts today or in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaveStart = new Date(leave.startDate);
  leaveStart.setHours(0, 0, 0, 0);
  
  if (leaveStart <= today) {
    await User.findByIdAndUpdate(leave.user._id, {
      status: 'on-leave'
    });
  }
  
  return leave;
};

/**
 * Reject leave request
 */
const rejectLeave = async (leaveId, reviewerId, reviewNote) => {
  const leave = await Leave.findById(leaveId);
  
  if (!leave) {
    throw new Error('Leave request not found');
  }
  
  if (leave.status !== LEAVE_STATUS.PENDING) {
    throw new Error(ERROR_MESSAGES.INVALID_STATUS_TRANSITION);
  }
  
  // Update leave record
  leave.status = LEAVE_STATUS.REJECTED;
  leave.reviewedBy = reviewerId;
  leave.reviewedAt = new Date();
  leave.reviewNote = reviewNote;
  
  await leave.save();
  return leave;
};

/**
 * Cancel leave request
 */
const cancelLeave = async (leaveId, userId, userRole) => {
  const leave = await Leave.findById(leaveId);
  
  if (!leave) {
    throw new Error('Leave request not found');
  }
  
  // Only the requester or HR/Admin can cancel
  if (leave.user.toString() !== userId.toString() && 
      userRole !== ROLES.HR && 
      userRole !== ROLES.ADMIN) {
    throw new Error(ERROR_MESSAGES.FORBIDDEN);
  }
  
  // Can only cancel pending or approved leaves
  if (leave.status === LEAVE_STATUS.REJECTED || leave.status === LEAVE_STATUS.CANCELLED) {
    throw new Error('Cannot cancel this leave request');
  }
  
  // If leave was approved, restore balance
  if (leave.status === LEAVE_STATUS.APPROVED && leave.balanceDeducted > 0) {
    await restoreLeaveBalance(leave.user, leave.leaveType, leave.balanceDeducted);
    leave.balanceRestored = true;
  }
  
  leave.status = LEAVE_STATUS.CANCELLED;
  await leave.save();
  
  // Update user status back to active if currently on leave
  await User.findByIdAndUpdate(leave.user, {
    status: 'active'
  });
  
  return leave;
};

/**
 * Get leave requests with filters
 */
const getLeaveRequests = async (companyId, filters = {}) => {
  const query = {};
  
  // Company filter (optional)
  if (companyId) {
    query.company = companyId;
  }
  
  // User filter
  if (filters.userId) {
    query.user = filters.userId;
  }
  
  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }
  
  // Leave type filter
  if (filters.leaveType) {
    query.leaveType = filters.leaveType;
  }
  
  // Date range filter
  if (filters.startDate && filters.endDate) {
    query.startDate = { $gte: new Date(filters.startDate) };
    query.endDate = { $lte: new Date(filters.endDate) };
  }
  
  const leaves = await Leave.find(query)
    .sort({ createdAt: -1 })
    .populate('user', 'name employeeId department position email')
    .populate('reviewedBy', 'name employeeId');
  
  return leaves;
};

/**
 * Get leave balance for user from LeaveBalance model
 */
const getLeaveBalance = async (userId) => {
  const balance = await LeaveBalance.findOne({ user: userId }).lean();
  
  if (!balance) {
    return { paid: 0, sick: 0, unpaid: 0, usedPaid: 0, usedSick: 0, usedUnpaid: 0 };
  }
  
  return {
    paid: balance.paid || 0,
    sick: balance.sick || 0,
    unpaid: balance.unpaid || 0,
    usedPaid: balance.usedPaid || 0,
    usedSick: balance.usedSick || 0,
    usedUnpaid: balance.usedUnpaid || 0,
  };
};

/**
 * Get leave statistics for user
 */
const getLeaveStatistics = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const leaves = await Leave.find({
    user: userId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate }
  });
  
  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === LEAVE_STATUS.PENDING).length,
    approved: leaves.filter(l => l.status === LEAVE_STATUS.APPROVED).length,
    rejected: leaves.filter(l => l.status === LEAVE_STATUS.REJECTED).length,
    cancelled: leaves.filter(l => l.status === LEAVE_STATUS.CANCELLED).length,
    daysTaken: leaves
      .filter(l => l.status === LEAVE_STATUS.APPROVED)
      .reduce((sum, l) => sum + l.days, 0),
    byType: {}
  };
  
  // Calculate days by type
  Object.values(LEAVE_TYPES).forEach(type => {
    stats.byType[type] = leaves
      .filter(l => l.leaveType === type && l.status === LEAVE_STATUS.APPROVED)
      .reduce((sum, l) => sum + l.days, 0);
  });
  
  return stats;
};

module.exports = {
  createLeaveRequest,
  createHalfDayLeaveRequest,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveRequests,
  getLeaveBalance,
  getLeaveStatistics,
  calculateLeaveDays,
  hasOverlappingLeave
};

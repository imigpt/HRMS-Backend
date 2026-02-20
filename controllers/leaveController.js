/**
 * LEAVE CONTROLLER - Request handlers for leave management
 * 
 * WHY: Handles leave requests, approvals, rejections with balance management.
 * Delegates business logic to service layer.
 */

const leaveService = require('../services/leave.service');
const { HTTP_STATUS, SUCCESS_MESSAGES, ROLES } = require('../constants');
const { createNotification, notifyHRAndAdmin } = require('./notificationController');

/**
 * @desc    Create leave request
 * @route   POST /api/leave
 * @access  Private (Employee)
 */
exports.createLeaveRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company || null; // Make company optional
    
    const leave = await leaveService.createLeaveRequest(userId, companyId, req.body);

    // Notify HR & Admin about new leave request
    await notifyHRAndAdmin(companyId, {
      title: 'New Leave Request',
      message: `${req.user.name || 'An employee'} submitted a ${leave.leaveType || ''} leave request`,
      type: 'leave',
      senderId: userId,
      relatedId: leave._id,
      relatedEntityType: 'Leave',
    });
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.LEAVE_REQUESTED,
      data: leave
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get leave requests
 * @route   GET /api/leave
 * @access  Private
 */
exports.getLeaveRequests = async (req, res) => {
  try {
    const companyId = req.user.company;
    const filters = { ...req.query };
    
    // If employee, only show their leaves
    if (req.user.role === ROLES.EMPLOYEE) {
      filters.userId = req.user._id;
    }
    
    const leaves = await leaveService.getLeaveRequests(companyId, filters);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get single leave request
 * @route   GET /api/leave/:id
 * @access  Private
 */
exports.getLeaveById = async (req, res) => {
  try {
    const Leave = require('../models/Leave.model');
    const leave = await Leave.findById(req.params.id)
      .populate('user', 'name employeeId department position')
      .populate('reviewedBy', 'name employeeId');
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check company access (skip if company is not set)
    if (leave.company && req.user.company && 
        leave.company.toString() !== req.user.company.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Employees can only view their own leaves
    if (req.user.role === ROLES.EMPLOYEE && 
        leave.user._id.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Approve leave request
 * @route   PUT /api/leave/:id/approve
 * @access  Private (HR, Admin)
 */
exports.approveLeave = async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const reviewerId = req.user._id;
    
    const leave = await leaveService.approveLeave(
      req.params.id, 
      reviewerId, 
      reviewNote
    );

    // Notify employee
    const userId = leave.user?._id || leave.user;
    await createNotification({
      userId,
      title: 'Leave Approved',
      message: 'Your leave request has been approved',
      type: 'leave',
      senderId: req.user._id,
      relatedId: leave._id,
      relatedEntityType: 'Leave',
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LEAVE_APPROVED,
      data: leave
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Reject leave request
 * @route   PUT /api/leave/:id/reject
 * @access  Private (HR, Admin)
 */
exports.rejectLeave = async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const reviewerId = req.user._id;
    
    if (!reviewNote) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Review note is required when rejecting leave'
      });
    }
    
    const leave = await leaveService.rejectLeave(
      req.params.id, 
      reviewerId, 
      reviewNote
    );

    // Notify employee
    const userId = leave.user?._id || leave.user;
    await createNotification({
      userId,
      title: 'Leave Rejected',
      message: 'Your leave request has been rejected',
      type: 'leave',
      senderId: req.user._id,
      relatedId: leave._id,
      relatedEntityType: 'Leave',
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LEAVE_REJECTED,
      data: leave
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Cancel leave request
 * @route   PUT /api/leave/:id/cancel
 * @access  Private
 */
exports.cancelLeave = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const leave = await leaveService.cancelLeave(
      req.params.id, 
      userId, 
      userRole
    );

    // Notify HR & Admin
    await notifyHRAndAdmin(req.user.company, {
      title: 'Leave Cancelled',
      message: `${req.user.name || 'An employee'} cancelled their leave request`,
      type: 'leave',
      senderId: userId,
      relatedId: leave._id,
      relatedEntityType: 'Leave',
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LEAVE_CANCELLED,
      data: leave
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get leave balance
 * @route   GET /api/leave/balance
 * @access  Private
 */
exports.getLeaveBalance = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;
    
    // Employees can only view their own balance
    if (req.user.role === ROLES.EMPLOYEE && userId !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const balance = await leaveService.getLeaveBalance(userId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: balance
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get leave statistics
 * @route   GET /api/leave/statistics
 * @access  Private
 */
exports.getLeaveStatistics = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;
    const year = req.query.year || new Date().getFullYear();
    
    // Employees can only view their own statistics
    if (req.user.role === ROLES.EMPLOYEE && userId !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const stats = await leaveService.getLeaveStatistics(userId, parseInt(year));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Edit leave request (Admin only)
 * @route   PUT /api/leave/:id
 * @access  Private (Admin)
 */
exports.editLeave = async (req, res) => {
  try {
    const Leave = require('../models/Leave.model');
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    const oldDays = leave.days;
    const oldType = leave.leaveType;
    const wasApproved = leave.status === 'approved';

    // Update allowed fields
    const { leaveType, startDate, endDate, reason, status } = req.body;
    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (reason) leave.reason = reason;

    // Recalculate days if dates changed
    if (startDate || endDate) {
      leave.days = leaveService.calculateLeaveDays(leave.startDate, leave.endDate);
    }

    // If status is being updated  
    if (status && status !== leave.status) {
      // If was approved and now changing → restore old balance
      if (wasApproved && leave.balanceDeducted > 0) {
        const leaveServiceMod = require('../services/leave.service');
        // restoreLeaveBalance is internal; do it manually
        const LeaveBalance = require('../models/LeaveBalance.model');
        const usedFieldMap = { paid: 'usedPaid', sick: 'usedSick', unpaid: 'usedUnpaid' };
        const oldUsedField = usedFieldMap[oldType];
        if (oldUsedField) {
          await LeaveBalance.findOneAndUpdate(
            { user: leave.user },
            { $inc: { [oldUsedField]: -oldDays } }
          );
        }
        leave.balanceDeducted = 0;
      }

      // If new status is approved → deduct new balance
      if (status === 'approved') {
        const LeaveBalance = require('../models/LeaveBalance.model');
        const usedFieldMap = { paid: 'usedPaid', sick: 'usedSick', unpaid: 'usedUnpaid' };
        const newUsedField = usedFieldMap[leave.leaveType];
        if (newUsedField) {
          await LeaveBalance.findOneAndUpdate(
            { user: leave.user },
            { $inc: { [newUsedField]: leave.days } }
          );
        }
        leave.balanceDeducted = leave.days;
        leave.reviewedBy = req.user._id;
        leave.reviewedAt = new Date();
      }

      leave.status = status;
    } else if (wasApproved && (startDate || endDate || leaveType)) {
      // Status unchanged but days/type changed for approved leave → recalc balance
      const LeaveBalance = require('../models/LeaveBalance.model');
      const usedFieldMap = { paid: 'usedPaid', sick: 'usedSick', unpaid: 'usedUnpaid' };

      // Restore old
      const oldUsedField = usedFieldMap[oldType];
      if (oldUsedField) {
        await LeaveBalance.findOneAndUpdate(
          { user: leave.user },
          { $inc: { [oldUsedField]: -oldDays } }
        );
      }
      // Deduct new
      const newUsedField = usedFieldMap[leave.leaveType];
      if (newUsedField) {
        await LeaveBalance.findOneAndUpdate(
          { user: leave.user },
          { $inc: { [newUsedField]: leave.days } }
        );
      }
      leave.balanceDeducted = leave.days;
    }

    await leave.save();

    // Notify employee
    const userId = leave.user?._id || leave.user;
    await createNotification({
      userId,
      title: 'Leave Updated',
      message: 'Your leave request was updated by Admin',
      type: 'leave',
      senderId: req.user._id,
      relatedId: leave._id,
      relatedEntityType: 'Leave',
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave,
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete leave request (Admin only)
 * @route   DELETE /api/leave/:id
 * @access  Private (Admin)
 */
exports.deleteLeave = async (req, res) => {
  try {
    const Leave = require('../models/Leave.model');
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // If leave was approved, restore balance
    if (leave.status === 'approved' && leave.balanceDeducted > 0) {
      const LeaveBalance = require('../models/LeaveBalance.model');
      const usedFieldMap = { paid: 'usedPaid', sick: 'usedSick', unpaid: 'usedUnpaid' };
      const usedField = usedFieldMap[leave.leaveType];
      if (usedField) {
        await LeaveBalance.findOneAndUpdate(
          { user: leave.user },
          { $inc: { [usedField]: -leave.balanceDeducted } }
        );
      }
    }

    const userId = leave.user?._id || leave.user;

    await Leave.findByIdAndDelete(req.params.id);

    // Notify employee
    await createNotification({
      userId,
      title: 'Leave Deleted',
      message: 'Your leave request was deleted by Admin',
      type: 'leave',
      senderId: req.user._id,
      relatedEntityType: 'Leave',
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave request deleted successfully',
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

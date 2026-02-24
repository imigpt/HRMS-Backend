/**
 * LEAVE ROUTES - Endpoints for leave management
 * 
 * WHY: Defines all leave-related routes with proper validation,
 * authorization, and company isolation.
 */

const express = require('express');
const router = express.Router();

const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
const { validateLeaveRequest, validateHalfDayLeaveRequest, validateObjectId, validateDateRange } = require('../middleware/validator');
const { enforceCompanyAccess } = require('../middleware/companyIsolation.middleware');
const leaveController = require('../controllers/leaveController');
const Leave = require('../models/Leave.model');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/leave/balance
 * @desc    Get leave balance
 * @access  Private (All authenticated users)
 */
router.get('/balance', checkPermission('leaves', 'view'), leaveController.getLeaveBalance);

/**
 * @route   GET /api/leave/statistics
 * @desc    Get leave statistics
 * @access  Private (All authenticated users)
 */
router.get('/statistics', checkPermission('leaves', 'view'), leaveController.getLeaveStatistics);

/**
 * @route   POST /api/leave
 * @desc    Create leave request
 * @access  Private (All authenticated users)
 */
router.post('/', checkPermission('leaves', 'create'), validateLeaveRequest, leaveController.createLeaveRequest);

/**
 * @route   POST /api/leave/half-day
 * @desc    Create half-day leave request
 * @access  Private (Employee, HR, Admin)
 * NOTE: No checkPermission gate here — all authenticated users may apply for
 * their own half-day leave. The permission system would block employees
 * if 'leaves' is not configured in their role, so we use protect + optional
 * role guard only. Admins inherit access from protect.
 */
router.post(
  '/half-day',
  authorize('admin', 'hr', 'employee'),
  validateHalfDayLeaveRequest,
  leaveController.createHalfDayLeave
);

/**
 * @route   GET /api/leave
 * @desc    Get leave requests (filtered by role)
 * @access  Private (All authenticated users)
 */
router.get('/', checkPermission('leaves', 'view'), validateDateRange, leaveController.getLeaveRequests);

/**
 * @route   GET /api/leave/:id
 * @desc    Get single leave request
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  validateObjectId('id'),
  enforceCompanyAccess(Leave),
  leaveController.getLeaveById
);

/**
 * @route   PUT /api/leave/:id/approve
 * @desc    Approve leave request
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id/approve',
  authorize('admin', 'hr'),
  validateObjectId('id'),
  enforceCompanyAccess(Leave),
  leaveController.approveLeave
);

/**
 * @route   PUT /api/leave/:id/reject
 * @desc    Reject leave request
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id/reject',
  authorize('admin', 'hr'),
  validateObjectId('id'),
  enforceCompanyAccess(Leave),
  leaveController.rejectLeave
);

/**
 * @route   PUT /api/leave/:id/cancel
 * @desc    Cancel leave request
 * @access  Private (All authenticated users - with permission check in controller)
 */
router.put(
  '/:id/cancel',
  validateObjectId('id'),
  enforceCompanyAccess(Leave),
  leaveController.cancelLeave
);

module.exports = router;


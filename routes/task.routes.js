/**
 * TASK ROUTES - Endpoints for task management
 * 
 * WHY: Defines all task-related routes with proper validation,
 * authorization, and ownership rules enforcement.
 */

const express = require('express');
const router = express.Router();

const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
const { validateTask, validateObjectId } = require('../middleware/validator');
const { enforceCompanyAccess } = require('../middleware/companyIsolation.middleware');
const upload = require('../middleware/uploadMiddleware');
const taskController = require('../controllers/taskController');
const Task = require('../models/Task.model');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/tasks/statistics
 * @desc    Get task statistics
 * @access  Private (All authenticated users)
 */
router.get('/statistics', checkPermission('tasks', 'view'), taskController.getTaskStatistics);

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private (All authenticated users)
 */
router.post('/', checkPermission('tasks', 'create'), validateTask, taskController.createTask);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (filtered by role)
 * @access  Private (All authenticated users)
 */
router.get('/', checkPermission('tasks', 'view'), taskController.getTasks);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  validateObjectId('id'),
  enforceCompanyAccess(Task),
  taskController.getTaskById
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private (All authenticated users - with permission check in controller)
 */
router.put(
  '/:id',
  validateObjectId('id'),
  enforceCompanyAccess(Task),
  taskController.updateTask
);

/**
 * @route   PUT /api/tasks/:id/progress
 * @desc    Update task progress
 * @access  Private (All authenticated users)
 */
router.put(
  '/:id/progress',
  validateObjectId('id'),
  enforceCompanyAccess(Task),
  taskController.updateTaskProgress
);

/**
 * @route   POST /api/tasks/:id/attachments
 * @desc    Add attachment to task (file upload)
 * @access  Private (All authenticated users)
 */
router.post(
  '/:id/attachments',
  validateObjectId('id'),
  enforceCompanyAccess(Task),
  upload.single('attachment'),
  taskController.addAttachment
);

/**
 * @route   DELETE /api/tasks/:id/attachments/:attachmentId
 * @desc    Delete attachment from task
 * @access  Private (All authenticated users)
 */
router.delete(
  '/:id/attachments/:attachmentId',
  validateObjectId('id'),
  taskController.deleteAttachment
);

/**
 * @route   PUT /api/tasks/:id/review
 * @desc    Add review to task (HR/Admin only)
 * @access  Private (HR/Admin)
 */
router.put(
  '/:id/review',
  validateObjectId('id'),
  authorize('hr', 'admin'),
  taskController.addReview
);

/**
 * @route   PUT /api/tasks/:id/subtasks/:subTaskId
 * @desc    Update subtask completion status
 * @access  Private (All authenticated users)
 */
router.put(
  '/:id/subtasks/:subTaskId',
  validateObjectId('id'),
  taskController.updateSubTask
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (All authenticated users - with permission check in controller)
 */
router.delete(
  '/:id',
  validateObjectId('id'),
  enforceCompanyAccess(Task),
  taskController.deleteTask
);

module.exports = router;


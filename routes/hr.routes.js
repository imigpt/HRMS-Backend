/**
 * HR ROUTES - HR-specific endpoints
 */

const express = require('express');
const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
const hrController = require('../controllers/hrController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require HR or Admin authentication
router.use(protect, authorize('hr', 'admin'));

// Dashboard and statistics
router.get('/dashboard', checkPermission('dashboard', 'view'), hrController.getDashboardStats);
router.get('/departments/stats', checkPermission('dashboard', 'view'), hrController.getDepartmentStats);

// Employee management within company
router.get('/employees', checkPermission('employees', 'view'), hrController.getEmployees);
router.get('/employees/:id', checkPermission('employees', 'view'), hrController.getEmployeeDetail);
router.post('/employees', checkPermission('employees', 'create'), upload.single('profilePhoto'), hrController.createEmployee);
router.put('/employees/:id', checkPermission('employees', 'edit'), upload.single('profilePhoto'), hrController.updateEmployee);
router.delete('/employees/:id', checkPermission('employees', 'delete'), hrController.deleteEmployee);

// Attendance overview
router.get('/attendance/today', checkPermission('attendance', 'view'), hrController.getTodayAttendance);

// Pending items
router.get('/leaves/pending', checkPermission('leaves', 'view'), hrController.getPendingLeaves);
router.get('/expenses/pending', checkPermission('expenses', 'view'), hrController.getPendingExpenses);

module.exports = router;

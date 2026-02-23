/**
 * SETTINGS ROUTES - Admin settings management endpoints
 * 
 * All routes are admin-only unless specified otherwise.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const settingsController = require('../controllers/settingsController');

// All routes require authentication
router.use(protect);

// ========================
// System Settings (Admin only)
// ========================
router.get('/', authorize('admin'), settingsController.getSettings);
router.put('/update', authorize('admin'), settingsController.updateSetting);
router.put('/category/:category', authorize('admin'), settingsController.updateCategorySettings);

// ========================
// HRM Settings
// ========================
router.get('/hrm', authorize('admin'), settingsController.getHRMSettings);
router.put('/hrm', authorize('admin'), settingsController.updateHRMSettings);

// ========================
// Company Settings
// ========================
router.get('/company', authorize('admin'), settingsController.getCompanySettings);
router.put('/company', authorize('admin'), settingsController.updateCompanySettings);

// ========================
// Employee ID Config
// ========================
router.get('/employee-id', authorize('admin'), settingsController.getEmployeeIDConfig);
router.put('/employee-id', authorize('admin'), settingsController.updateEmployeeIDConfig);
router.post('/employee-id/assign', authorize('admin'), settingsController.assignEmployeeID);
router.get('/employee-id/:userId', authorize('admin'), settingsController.getEmployeeID);

// ========================
// My Permissions (any authenticated user)
// ========================
router.get('/roles/my-permissions', settingsController.getMyPermissions);

// ========================
// Roles & Permissions
// ========================
router.get('/roles', authorize('admin'), settingsController.getRoles);
router.post('/roles', authorize('admin'), settingsController.createRole);
router.post('/roles/seed', authorize('admin'), settingsController.seedDefaultRoles);
router.put('/roles/:id', authorize('admin'), settingsController.updateRole);
router.delete('/roles/:id', authorize('admin'), settingsController.deleteRole);
router.get('/roles/:id/permissions', authorize('admin'), settingsController.getRolePermissions);
router.put('/roles/:id/permissions', authorize('admin'), settingsController.assignPermissions);

// ========================
// Permission Modules (dynamic module management)
// ========================
router.get('/modules', authorize('admin'), settingsController.getPermissionModules);
router.post('/modules', authorize('admin'), settingsController.createPermissionModule);
router.post('/modules/seed', authorize('admin'), settingsController.seedPermissionModules);
router.put('/modules/:id', authorize('admin'), settingsController.updatePermissionModule);
router.delete('/modules/:id', authorize('admin'), settingsController.deletePermissionModule);

// ========================
// Email Settings
// ========================
router.get('/email', authorize('admin'), settingsController.getEmailSettings);
router.put('/email', authorize('admin'), settingsController.updateEmailSettings);
router.post('/email/test', authorize('admin'), settingsController.sendTestEmail);
router.post('/email/send', authorize('admin'), settingsController.sendBulkEmail);
router.get('/email/logs', authorize('admin'), settingsController.getEmailLogs);

// ========================
// Email Templates
// ========================
router.get('/email/templates', authorize('admin'), settingsController.getEmailTemplates);
router.get('/email/templates/:id', authorize('admin'), settingsController.getEmailTemplate);
router.post('/email/templates', authorize('admin'), settingsController.createEmailTemplate);
router.post('/email/templates/seed', authorize('admin'), settingsController.seedEmailTemplates);
router.put('/email/templates/:id', authorize('admin'), settingsController.updateEmailTemplate);
router.delete('/email/templates/:id', authorize('admin'), settingsController.deleteEmailTemplate);
router.post('/email/templates/:id/send', authorize('admin'), settingsController.sendEmailFromTemplate);

// ========================
// Storage Settings
// ========================
router.get('/storage', authorize('admin'), settingsController.getStorageSettings);
router.put('/storage', authorize('admin'), settingsController.updateStorageSettings);

// ========================
// Localization
// ========================
router.get('/localization', authorize('admin'), settingsController.getLocalizationSettings);
router.put('/localization', authorize('admin'), settingsController.updateLocalizationSettings);

// ========================
// Payroll Settings
// ========================
router.get('/payroll', authorize('admin'), settingsController.getPayrollSettings);
router.put('/payroll', authorize('admin'), settingsController.updatePayrollSettings);

// ========================
// Work Status Settings
// ========================
router.get('/work-status', authorize('admin'), settingsController.getWorkStatusSettings);
router.put('/work-status', authorize('admin'), settingsController.updateWorkStatusSettings);

module.exports = router;

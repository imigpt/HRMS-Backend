/**
 * PAYROLL ROUTES - Endpoints for payroll management
 * 
 * Admin: full CRUD access
 * HR/Employee: view-only access (own data)
 */

const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
const payrollController = require('../controllers/payrollController');

// All routes require authentication
router.use(protect);

// ============ EMPLOYEE SALARY ============

// My salary (HR/Employee)
router.get('/salaries/me', checkPermission('payroll', 'view'), payrollController.getMySalary);

// All salaries (Admin sees all, HR/Employee see own)
router.get('/salaries', checkPermission('payroll', 'view'), payrollController.getAllSalaries);

// Get salary by ID
router.get('/salaries/:id', checkPermission('payroll', 'view'), payrollController.getSalaryById);

// Admin only: create/update/delete salary
router.post('/salaries', authorize('admin'), payrollController.createSalary);
router.put('/salaries/:id', authorize('admin'), payrollController.updateSalary);
router.delete('/salaries/:id', authorize('admin'), payrollController.deleteSalary);

// ============ PRE-PAYMENTS ============

// All pre-payments (Admin sees all, HR/Employee see own)
router.get('/pre-payments', payrollController.getAllPrePayments);

// Get pre-payment by ID
router.get('/pre-payments/:id', payrollController.getPrePaymentById);

// Admin only: create/update/delete pre-payments
router.post('/pre-payments', authorize('admin'), payrollController.createPrePayment);
router.put('/pre-payments/:id', authorize('admin'), payrollController.updatePrePayment);
router.delete('/pre-payments/:id', authorize('admin'), payrollController.deletePrePayment);

// ============ INCREMENT / PROMOTION ============

// All records (Admin sees all, HR/Employee see own)
router.get('/increments', payrollController.getAllIncrementPromotions);

// Get record by ID
router.get('/increments/:id', payrollController.getIncrementPromotionById);

// Admin only: create/update/delete
router.post('/increments', authorize('admin'), payrollController.createIncrementPromotion);
router.put('/increments/:id', authorize('admin'), payrollController.updateIncrementPromotion);
router.delete('/increments/:id', authorize('admin'), payrollController.deleteIncrementPromotion);

// ============ PAYROLL ============

// My payrolls (HR/Employee)
router.get('/my-payrolls', payrollController.getMyPayrolls);

// All payrolls (Admin sees all, HR/Employee see own through filter)
router.get('/', payrollController.getAllPayrolls);

// Get payroll by ID
router.get('/:id', payrollController.getPayrollById);

// Admin only: generate/update/delete payroll
router.post('/generate', authorize('admin'), payrollController.generatePayroll);
router.put('/:id', authorize('admin'), payrollController.updatePayroll);
router.delete('/:id', authorize('admin'), payrollController.deletePayroll);

module.exports = router;

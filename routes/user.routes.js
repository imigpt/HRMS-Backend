const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const userController = require('../controllers/userController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Update own profile (with photo upload)
router.put('/profile', protect, upload.single('profilePhoto'), userController.updateProfile);

// Get all users (admin/hr only)
router.get('/', protect, authorize('admin', 'hr'), userController.getAllUsers);

// Get user by ID (with permission checks in controller)
router.get('/:id', protect, userController.getUserById);

// Update user (with permission checks in controller, supports photo upload)
router.put('/:id', protect, upload.single('profilePhoto'), userController.updateUser);

// Delete user (admin/hr only, with additional checks in controller)
router.delete('/:id', protect, authorize('admin', 'hr'), userController.deleteUser);

module.exports = router;

const express = require('express');
const {
  login,
  register,
  logout,
  getMe,
  getLoginHistory,
  updateLocation,
  forgotPassword,
  resetPassword,
  changePassword,
  adminResetPassword,
  generatePassword,
  getUserCredentials
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (authentication required)
router.post('/register', protect, authorize('admin', 'hr'), upload.single('profilePhoto'), register);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/login-history/:userId', protect, getLoginHistory);
router.put('/update-location', protect, updateLocation);

// Password management
router.put('/change-password', protect, changePassword);
router.put('/admin-reset-password/:userId', protect, authorize('admin', 'hr'), adminResetPassword);
router.get('/generate-password', protect, authorize('admin', 'hr'), generatePassword);
router.get('/user-credentials', protect, authorize('admin', 'hr'), getUserCredentials);

module.exports = router;

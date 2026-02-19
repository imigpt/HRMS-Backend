const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAllBalances,
  getBalanceByUser,
  getMyBalance,
  assignBalance,
  bulkAssign,
} = require('../controllers/leaveBalanceController');

router.use(protect);

// Self-service: get my own balance (must be before /:userId)
router.get('/me', getMyBalance);

// Admin routes
router.get('/', authorize('admin'), getAllBalances);
router.get('/:userId', getBalanceByUser);
router.put('/:userId', authorize('admin'), assignBalance);
router.post('/bulk', authorize('admin'), bulkAssign);

module.exports = router;

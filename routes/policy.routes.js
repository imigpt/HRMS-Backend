const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getPolicies,
  getPolicyById,
  createPolicy,
  deletePolicy,
  downloadPolicy,
} = require('../controllers/policyController');

// All routes require authentication
router.use(protect);

// Read access: all authenticated roles
router.get('/', getPolicies);
router.get('/:id', getPolicyById);
router.get('/:id/download', downloadPolicy);

// Write access: admin only
router.post('/', authorize('admin'), upload.single('file'), createPolicy);
router.delete('/:id', authorize('admin'), deletePolicy);

module.exports = router;

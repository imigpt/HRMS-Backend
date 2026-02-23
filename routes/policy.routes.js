const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
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

// Read access: all authenticated roles with permission
router.get('/', checkPermission('policies', 'view'), getPolicies);
router.get('/:id', checkPermission('policies', 'view'), getPolicyById);
router.get('/:id/download', checkPermission('policies', 'view'), downloadPolicy);

// Write access: admin only
router.post('/', authorize('admin'), upload.single('file'), createPolicy);
router.delete('/:id', authorize('admin'), deletePolicy);

module.exports = router;

/**
 * CLIENT ROUTES
 * Admin and HR can manage clients.
 * Clients can access their dashboard.
 */

const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const clientController = require('../controllers/clientController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// ─── Client self-service (client role) ───────────────────────────────────────
// Client dashboard (only accessible by authenticated clients)
router.get(
  '/dashboard',
  protect,
  authorize('client'),
  clientController.getClientDashboard
);

// ─── Admin & HR management routes ─────────────────────────────────────────────
// All routes below require admin or hr role
router.get('/', protect, authorize('admin', 'hr'), clientController.getClients);
router.get('/:id', protect, authorize('admin', 'hr'), clientController.getClientById);
router.post(
  '/',
  protect,
  authorize('admin', 'hr'),
  upload.single('profilePhoto'),
  clientController.createClient
);
router.put('/:id', protect, authorize('admin', 'hr'), clientController.updateClient);
router.delete('/:id', protect, authorize('admin', 'hr'), clientController.deleteClient);

module.exports = router;

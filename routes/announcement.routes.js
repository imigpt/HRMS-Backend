const express = require('express');
const { protect, authorize, checkPermission } = require('../middleware/auth.middleware');
const announcementController = require('../controllers/announcementController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// All users can view announcements (if they have permission)
router.get('/', checkPermission('announcements', 'view'), announcementController.getAnnouncements);
router.get('/unread/count', checkPermission('announcements', 'view'), announcementController.getUnreadCount);
router.get('/:id', checkPermission('announcements', 'view'), announcementController.getAnnouncementById);
router.put('/:id/read', checkPermission('announcements', 'view'), announcementController.markAsRead);

// HR and Admin can manage announcements
router.post('/', authorize('admin', 'hr'), checkPermission('announcements', 'create'), announcementController.createAnnouncement);
router.put('/:id', authorize('admin', 'hr'), checkPermission('announcements', 'edit'), announcementController.updateAnnouncement);
router.delete('/:id', authorize('admin', 'hr'), checkPermission('announcements', 'delete'), announcementController.deleteAnnouncement);

module.exports = router;

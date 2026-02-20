/**
 * NOTIFICATION CONTROLLER
 * Handles in-app notification CRUD for all users.
 */

const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const { HTTP_STATUS } = require('../constants');

/**
 * Create a notification (internal helper, not a route handler)
 * @param {Object} opts
 * @param {string} opts.userId - Recipient user ID
 * @param {string} opts.title - Short notification title
 * @param {string} opts.message - Notification body
 * @param {string} opts.type - 'leave' | 'attendance' | 'task' | 'expense' | 'announcement' | 'chat' | 'system'
 * @param {string} [opts.senderId] - Who caused the notification
 * @param {string} [opts.relatedId] - Related entity ObjectId
 * @param {string} [opts.relatedEntityType] - 'Leave' | 'Attendance' | 'Task' | 'Expense' | 'Announcement' | 'ChatRoom' | 'User'
 */
const createNotification = async (opts) => {
  try {
    // Support legacy 4-arg calls: createNotification(userId, message, type, relatedId)
    if (typeof opts === 'string' || (opts && opts._bsontype)) {
      const args = Array.from(arguments);
      opts = {
        userId: args[0],
        message: args[1],
        title: args[1],
        type: args[2] || 'system',
        relatedId: args[3] || null,
      };
    }
    await Notification.create({
      user: opts.userId,
      sender: opts.senderId || null,
      title: opts.title || opts.message,
      message: opts.message,
      type: opts.type || 'system',
      relatedId: opts.relatedId || null,
      relatedEntityType: opts.relatedEntityType || null,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

/**
 * Broadcast a notification to all HR+Admin users in a company
 */
const notifyHRAndAdmin = async (companyId, opts) => {
  try {
    const filter = { role: { $in: ['hr', 'admin'] }, status: 'active' };
    if (companyId) {
      filter.$or = [{ company: companyId }, { company: { $exists: false } }, { company: null }];
    }
    const users = await User.find(filter).select('_id').lean();
    for (const u of users) {
      await createNotification({ ...opts, userId: u._id });
    }
  } catch (err) {
    console.error('notifyHRAndAdmin error:', err.message);
  }
};

/**
 * Broadcast a notification to all users in a company (for announcements)
 */
const notifyAllCompanyUsers = async (companyId, opts) => {
  try {
    const filter = { status: 'active', role: { $ne: 'client' } };
    if (companyId) {
      filter.$or = [{ company: companyId }, { company: { $exists: false } }, { company: null }];
    }
    const users = await User.find(filter).select('_id').lean();
    for (const u of users) {
      // Skip the sender
      if (opts.senderId && u._id.toString() === opts.senderId.toString()) continue;
      await createNotification({ ...opts, userId: u._id });
    }
  } catch (err) {
    console.error('notifyAllCompanyUsers error:', err.message);
  }
};

/**
 * @desc  Get notifications for authenticated user
 * @route GET /api/notifications
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type;

    const query = { user: req.user._id };

    // Client role: only chat notifications
    if (req.user.role === 'client') {
      query.type = 'chat';
    } else if (typeFilter && typeFilter !== 'all') {
      query.type = typeFilter;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name profilePhoto')
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Mark a single notification as read
 * @route PUT /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Notification not found' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, data: notification });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Mark all notifications as read
 * @route PUT /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const query = { user: req.user._id, isRead: false };
    if (req.user.role === 'client') query.type = 'chat';
    await Notification.updateMany(query, { isRead: true });
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Delete a notification
 * @route DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Notification not found' });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, message: error.message });
  }
};

// Export helpers for use in other controllers
exports.createNotification = createNotification;
exports.notifyHRAndAdmin = notifyHRAndAdmin;
exports.notifyAllCompanyUsers = notifyAllCompanyUsers;

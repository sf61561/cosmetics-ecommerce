const notificationService = require('../services/notificationService');

class NotificationController {
  // ── Customer Handlers ──

  async getNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getUserNotifications(req.user.id, {
        page,
        limit,
        unreadOnly,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const unreadCount = await notificationService.getUserUnreadCount(req.user.id);
      return res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      return next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      if (isNaN(notificationId)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
      }

      const updated = await notificationService.markAsRead(notificationId, req.user.id);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      return res.json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
      });
    } catch (err) {
      return next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const count = await notificationService.markAllAsRead(req.user.id);
      return res.json({
        success: true,
        message: 'All notifications marked as read',
        data: { markedCount: count },
      });
    } catch (err) {
      return next(err);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      if (isNaN(notificationId)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
      }

      const deleted = await notificationService.deleteNotification(notificationId, req.user.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      return res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      return next(err);
    }
  }

  async getPreferences(req, res, next) {
    try {
      const preferences = await notificationService.getUserPreferences(req.user.id);
      return res.json({
        success: true,
        data: { preferences },
      });
    } catch (err) {
      return next(err);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const { preferences } = req.body;
      if (!Array.isArray(preferences)) {
        return res.status(400).json({
          success: false,
          message: 'preferences array is required',
        });
      }

      const updated = await notificationService.updateUserPreferences(req.user.id, preferences);
      return res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: updated },
      });
    } catch (err) {
      return next(err);
    }
  }

  // ── Admin Handlers ──

  async getAdminNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getAdminNotifications({
        page,
        limit,
        unreadOnly,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  async getAdminUnreadCount(req, res, next) {
    try {
      const unreadCount = await notificationService.getAdminUnreadCount();
      return res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      return next(err);
    }
  }

  async markAllAdminAsRead(req, res, next) {
    try {
      const count = await notificationService.markAllAdminAsRead();
      return res.json({
        success: true,
        message: 'All admin alerts marked as read',
        data: { markedCount: count },
      });
    } catch (err) {
      return next(err);
    }
  }

  async markAdminAsRead(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      if (isNaN(notificationId)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' });
      }

      const updated = await notificationService.markAdminAsRead(notificationId);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      return res.json({
        success: true,
        message: 'Admin notification marked as read',
        data: updated,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new NotificationController();


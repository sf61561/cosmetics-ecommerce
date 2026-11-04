const express = require('express');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// ── Customer Notification Routes (Requires Authentication) ──
router.use(authenticate);

router.get('/', (req, res, next) => notificationController.getNotifications(req, res, next));
router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.post('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.delete('/:id', (req, res, next) => notificationController.deleteNotification(req, res, next));
router.get('/preferences', (req, res, next) => notificationController.getPreferences(req, res, next));
router.put('/preferences', (req, res, next) => notificationController.updatePreferences(req, res, next));

// ── Admin Notification Routes (Requires Admin Role) ──
const adminNotificationRouter = express.Router();
adminNotificationRouter.use(authenticate, requireRole('ADMIN'));

adminNotificationRouter.get('/', (req, res, next) => notificationController.getAdminNotifications(req, res, next));
adminNotificationRouter.get('/unread-count', (req, res, next) => notificationController.getAdminUnreadCount(req, res, next));
adminNotificationRouter.post('/read-all', (req, res, next) => notificationController.markAllAdminAsRead(req, res, next));
adminNotificationRouter.patch('/:id/read', (req, res, next) => notificationController.markAdminAsRead(req, res, next));

module.exports = {
  notificationRoutes: router,
  adminNotificationRouter,
};


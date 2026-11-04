const { query } = require('../config/db');
const notificationRepository = require('../repositories/notificationRepository');
const notificationWorker = require('./notificationWorker');
const { getTemplate } = require('./notificationTemplates');

class NotificationService {
  /**
   * Main unified notification dispatcher
   * @param {string} type - Event type (e.g., 'order.placed', 'order.shipped', 'admin.order_placed')
   * @param {Object} options - { userId, targetRole, data }
   */
  async notify(type, { userId = null, targetRole = 'CUSTOMER', data = {} } = {}) {
    const template = getTemplate(type);
    if (!template) {
      console.warn(`[NotificationService] Unrecognized notification event type: ${type}`);
      return null;
    }

    // 1. Resolve user contact information and preferences if user-targeted
    let user = null;
    let userPrefs = {};
    if (userId) {
      const userRes = await query(
        `SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1;`,
        [userId]
      );
      user = userRes.rows[0] || null;

      if (user) {
        const rawPrefs = await notificationRepository.getUserPreferences(userId);
        rawPrefs.forEach((p) => {
          userPrefs[`${p.category}:${p.channel}`] = p.enabled;
        });
      }
    }

    // 2. Render content from template
    const title = typeof template.title === 'function' ? template.title(data) : template.title;
    const body = typeof template.body === 'function' ? template.body(data) : template.body;
    const link = typeof template.link === 'function' ? template.link(data) : template.link;

    const enrichedData = {
      ...data,
      link: link || data.link || null,
      actionText: template.actionText || data.actionText || 'View',
      icon: template.icon || data.icon || 'bell',
    };

    // 3. Create In-App Notification (Always created if in_app channel configured)
    let inAppNotification = null;
    if (template.channels.includes('in_app')) {
      inAppNotification = await notificationRepository.createNotification({
        userId,
        targetRole,
        type,
        title,
        body,
        data: enrichedData,
      });
    }

    // 4. Enqueue Outbox Deliveries for external channels (email, sms, push)
    const externalChannels = template.channels.filter((ch) => ch !== 'in_app');
    for (const channel of externalChannels) {
      // Check customer preference if channel is not required
      const prefKey = `${template.category}:${channel}`;
      const isAllowed = template.required || userPrefs[prefKey] !== false;

      if (!isAllowed) {
        continue;
      }

      // Determine recipient address / phone number
      let recipient = null;
      if (channel === 'email') {
        recipient = data.customerEmail || data.to || user?.email;
      } else if (channel === 'sms') {
        recipient = data.customerPhone || data.phone || user?.phone;
      } else if (channel === 'push') {
        recipient = userId;
      }

      if (!recipient) {
        continue;
      }

      // Generate deterministic idempotency key
      const refId = data.orderNumber || data.orderId || data.referenceId || inAppNotification?.id || `${Date.now()}`;
      const idempotencyKey = `${type}:${refId}:${channel}`;

      await notificationRepository.createDelivery({
        notificationId: inAppNotification?.id || null,
        channel,
        recipient,
        idempotencyKey,
        maxAttempts: 4,
      });
    }

    // 5. Wake up background outbox worker immediately (asynchronous non-blocking)
    notificationWorker.triggerImmediate();

    return {
      success: true,
      notificationId: inAppNotification?.id || null,
    };
  }

  /**
   * Helper to dispatch admin notifications
   */
  async notifyAdmin(type, data = {}) {
    return this.notify(type, {
      userId: null,
      targetRole: 'ADMIN',
      data,
    });
  }

  /**
   * Customer in-app feed methods
   */
  async getUserNotifications(userId, options) {
    return notificationRepository.getUserNotifications(userId, options);
  }

  async getUserUnreadCount(userId) {
    return notificationRepository.getUserUnreadCount(userId);
  }

  async markAsRead(id, userId) {
    return notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id, userId) {
    return notificationRepository.deleteNotification(id, userId);
  }

  /**
   * Admin in-app feed methods
   */
  async getAdminNotifications(options) {
    return notificationRepository.getAdminNotifications(options);
  }

  async getAdminUnreadCount() {
    return notificationRepository.getAdminUnreadCount();
  }

  async markAllAdminAsRead() {
    return notificationRepository.markAllAdminAsRead();
  }

  async markAdminAsRead(id) {
    return notificationRepository.markAdminAsRead(id);
  }

  /**
   * Customer Preferences management
   */
  async getUserPreferences(userId) {
    const rawPrefs = await notificationRepository.getUserPreferences(userId);
    const prefMap = {};
    rawPrefs.forEach((p) => {
      prefMap[`${p.category}:${p.channel}`] = p.enabled;
    });

    // Return structured categories with locked indicators
    return [
      {
        category: 'order_updates',
        title: 'Order & Shipping Updates',
        description: 'Receive real-time order confirmations, dispatch updates, and delivery notices.',
        locked: true, // Essential transactional messages cannot be disabled
        channels: {
          email: true,
          in_app: true,
          sms: prefMap['order_updates:sms'] !== undefined ? prefMap['order_updates:sms'] : true,
        },
      },
      {
        category: 'security_alerts',
        title: 'Account & Security Alerts',
        description: 'Important notifications regarding password changes and account activity.',
        locked: true,
        channels: {
          email: true,
          in_app: true,
        },
      },
      {
        category: 'wishlist_alerts',
        title: 'Wishlist & Price Drops',
        description: 'Get notified when your saved beauty items drop in price or come back into stock.',
        locked: false,
        channels: {
          email: prefMap['wishlist_alerts:email'] !== undefined ? prefMap['wishlist_alerts:email'] : true,
          in_app: prefMap['wishlist_alerts:in_app'] !== undefined ? prefMap['wishlist_alerts:in_app'] : true,
        },
      },
      {
        category: 'promotions',
        title: 'Exclusive Deals & New Arrivals',
        description: 'Receive alerts about seasonal sales, member discounts, and curated skincare drops.',
        locked: false,
        channels: {
          email: prefMap['promotions:email'] !== undefined ? prefMap['promotions:email'] : false,
          in_app: prefMap['promotions:in_app'] !== undefined ? prefMap['promotions:in_app'] : false,
        },
      },
    ];
  }

  /**
   * Update customer preferences
   */
  async updateUserPreferences(userId, updates = []) {
    // updates: Array of { category, channel, enabled }
    const saved = [];
    for (const update of updates) {
      const { category, channel, enabled } = update;
      // Safeguard: never allow disabling mandatory transactional or security categories
      if (category === 'order_updates' && (channel === 'email' || channel === 'in_app')) {
        continue;
      }
      if (category === 'security_alerts') {
        continue;
      }

      const res = await notificationRepository.upsertUserPreference(
        userId,
        category,
        channel,
        Boolean(enabled)
      );
      saved.push(res);
    }
    return this.getUserPreferences(userId);
  }
}

module.exports = new NotificationService();


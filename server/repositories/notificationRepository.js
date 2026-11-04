const { query } = require('../config/db');

class NotificationRepository {
  /**
   * Create an in-app notification record
   */
  async createNotification({ userId = null, targetRole = 'CUSTOMER', type, title, body, data = {} }) {
    const text = `
      INSERT INTO notifications (user_id, target_role, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [userId, targetRole, type, title, body, JSON.stringify(data)];
    const result = await query(text, values);
    return result.rows[0];
  }

  /**
   * Get paginated notifications for a customer
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;
    let whereClause = `WHERE user_id = $1`;
    const params = [userId];

    if (unreadOnly) {
      whereClause += ` AND read_at IS NULL`;
    }

    const countText = `SELECT COUNT(*)::int as total FROM notifications ${whereClause};`;
    const countRes = await query(countText, params);
    const total = countRes.rows[0]?.total || 0;

    const listText = `
      SELECT id, user_id, target_role, type, title, body, data, read_at, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const listRes = await query(listText, [...params, limit, offset]);

    return {
      notifications: listRes.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get unread notifications count for customer
   */
  async getUserUnreadCount(userId) {
    const text = `
      SELECT COUNT(*)::int as unread_count 
      FROM notifications 
      WHERE user_id = $1 AND read_at IS NULL;
    `;
    const res = await query(text, [userId]);
    return res.rows[0]?.unread_count || 0;
  }

  /**
   * Mark a notification as read (ensuring user ownership)
   */
  async markAsRead(id, userId) {
    const text = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING *;
    `;
    const res = await query(text, [id, userId]);
    return res.rows[0] || null;
  }

  /**
   * Mark all unread notifications as read for a customer
   */
  async markAllAsRead(userId) {
    const text = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read_at IS NULL
      RETURNING id;
    `;
    const res = await query(text, [userId]);
    return res.rowCount;
  }

  /**
   * Delete / dismiss a notification
   */
  async deleteNotification(id, userId) {
    const text = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `;
    const res = await query(text, [id, userId]);
    return res.rowCount > 0;
  }

  /**
   * Get notifications for administrators
   */
  async getAdminNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;
    let whereClause = `WHERE target_role = 'ADMIN'`;
    const params = [];

    if (unreadOnly) {
      whereClause += ` AND read_at IS NULL`;
    }

    const countText = `SELECT COUNT(*)::int as total FROM notifications ${whereClause};`;
    const countRes = await query(countText, params);
    const total = countRes.rows[0]?.total || 0;

    const listText = `
      SELECT id, user_id, target_role, type, title, body, data, read_at, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const listRes = await query(listText, [...params, limit, offset]);

    return {
      notifications: listRes.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get unread count for admin notifications
   */
  async getAdminUnreadCount() {
    const text = `
      SELECT COUNT(*)::int as unread_count 
      FROM notifications 
      WHERE target_role = 'ADMIN' AND read_at IS NULL;
    `;
    const res = await query(text);
    return res.rows[0]?.unread_count || 0;
  }

  /**
   * Mark all unread admin notifications as read
   */
  async markAllAdminAsRead() {
    const text = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE target_role = 'ADMIN' AND read_at IS NULL
      RETURNING id;
    `;
    const res = await query(text);
    return res.rowCount;
  }

  /**
   * Mark a single admin notification as read
   */
  async markAdminAsRead(id) {
    const text = `
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND target_role = 'ADMIN' AND read_at IS NULL
      RETURNING *;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Outbox: create a delivery queue entry with idempotency key
   */
  async createDelivery({ notificationId, channel, recipient, idempotencyKey, maxAttempts = 4 }) {
    const text = `
      INSERT INTO notification_deliveries (
        notification_id, channel, recipient, idempotency_key, max_attempts, status
      )
      VALUES ($1, $2, $3, $4, $5, 'queued')
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *;
    `;
    const values = [notificationId, channel, recipient, idempotencyKey, maxAttempts];
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Outbox: Claim pending/failed deliveries using SKIP LOCKED
   */
  async claimPendingDeliveries(batchSize = 10) {
    const text = `
      WITH claimable AS (
        SELECT id
        FROM notification_deliveries
        WHERE status IN ('queued', 'failed')
          AND attempts < max_attempts
          AND next_retry_at <= CURRENT_TIMESTAMP
        ORDER BY next_retry_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE notification_deliveries nd
      SET status = 'processing',
          attempts = nd.attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      FROM claimable c
      JOIN notification_deliveries orig ON orig.id = c.id
      JOIN notifications n ON n.id = orig.notification_id
      WHERE nd.id = c.id
      RETURNING nd.*, n.type as event_type, n.title as event_title, n.body as event_body, n.data as event_data;
    `;
    const res = await query(text, [batchSize]);
    return res.rows;
  }

  /**
   * Outbox: Update delivery outcome (sent, failed, or retry scheduled)
   */
  async updateDeliveryStatus(id, { status, providerMessageId = null, error = null, nextRetryAt = null }) {
    const text = `
      UPDATE notification_deliveries
      SET status = $2::varchar,
          provider_message_id = COALESCE($3::varchar, provider_message_id),
          error = $4::text,
          next_retry_at = COALESCE($5::timestamptz, next_retry_at),
          sent_at = CASE WHEN $2::text = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(text, [id, status, providerMessageId, error, nextRetryAt]);
    return res.rows[0];
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    const text = `
      SELECT category, channel, enabled
      FROM notification_preferences
      WHERE user_id = $1;
    `;
    const res = await query(text, [userId]);
    return res.rows;
  }

  /**
   * Upsert single user notification preference
   */
  async upsertUserPreference(userId, category, channel, enabled) {
    const text = `
      INSERT INTO notification_preferences (user_id, category, channel, enabled, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, category, channel)
      DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const res = await query(text, [userId, category, channel, enabled]);
    return res.rows[0];
  }
}

module.exports = new NotificationRepository();

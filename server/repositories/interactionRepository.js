const { query, getClient } = require("../config/db");

const interactionRepository = {
  /**
   * Verify if a product exists and is active for interaction
   */
  async checkProductActive(productId) {
    const sql = `SELECT id, name, status, brand_id, category_id FROM products WHERE id = $1 LIMIT 1;`;
    const res = await query(sql, [productId]);
    return res.rows[0] || null;
  },

  /**
   * Check if an identical interaction occurred within the debounce window
   */
  async isDebounced({ userId = null, sessionId = null, productId, interactionType, windowSeconds = 15 }) {
    const sql = `
      SELECT id FROM interactions
      WHERE (
        ($1::uuid IS NOT NULL AND user_id = $1)
        OR ($1::uuid IS NULL AND $2::varchar IS NOT NULL AND session_id = $2)
      )
      AND product_id = $3
      AND interaction_type = $4
      AND created_at >= NOW() - ($5 || ' seconds')::INTERVAL
      LIMIT 1;
    `;
    const res = await query(sql, [userId, sessionId, productId, interactionType, windowSeconds]);
    return res.rows.length > 0;
  },

  /**
   * Record an interaction event
   */
  async create({ userId = null, sessionId = null, productId, interactionType }, externalClient = null) {
    const sql = `
      INSERT INTO interactions (user_id, session_id, product_id, interaction_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, user_id, session_id, product_id, interaction_type, created_at;
    `;
    const values = [userId, sessionId, productId, interactionType];

    const res = externalClient
      ? await externalClient.query(sql, values)
      : await query(sql, values);

    return res.rows[0];
  },

  /**
   * Retrieve customer interaction history with age in days and linked product metadata
   */
  async getCustomerHistory({ userId = null, sessionId = null, maxAgeDays = 60, limit = 100 }) {
    if (!userId && !sessionId) return [];

    const sql = `
      SELECT 
        i.id,
        i.product_id,
        i.interaction_type,
        i.created_at,
        EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 86400.0 AS age_days,
        p.name AS product_name,
        p.brand_id,
        p.category_id,
        p.status AS product_status
      FROM interactions i
      JOIN products p ON p.id = i.product_id
      WHERE (
        ($1::uuid IS NOT NULL AND i.user_id = $1)
        OR ($1::uuid IS NULL AND $2::varchar IS NOT NULL AND i.session_id = $2)
      )
      AND i.created_at >= NOW() - ($3 || ' days')::INTERVAL
      AND p.status = 'ACTIVE'
      ORDER BY i.created_at DESC
      LIMIT $4;
    `;
    const res = await query(sql, [userId, sessionId, maxAgeDays, limit]);
    return res.rows;
  },

  /**
   * Get products already purchased by user to avoid recommending immediate rebuys unless appropriate
   */
  async getPurchasedProductIds(userId) {
    if (!userId) return new Set();

    const sql = `
      SELECT DISTINCT product_id 
      FROM interactions 
      WHERE user_id = $1 AND interaction_type = 'PURCHASE';
    `;
    const res = await query(sql, [userId]);
    return new Set(res.rows.map((r) => r.product_id));
  },
};

module.exports = interactionRepository;


const { query } = require("../config/db");

class CartRepository {
  /**
   * Find all cart items for a given user or guest session
   * Dynamically joins latest product catalog information, real-time stock, pricing, and images
   */
  async findCartItems({ userId = null, sessionId = null }) {
    if (!userId && !sessionId) return [];

    let whereClause = "";
    const params = [];

    if (userId) {
      params.push(userId);
      whereClause = `ci.user_id = $1`;
    } else {
      params.push(sessionId);
      whereClause = `ci.user_id IS NULL AND ci.session_id = $1`;
    }

    const sql = `
      SELECT 
        ci.id AS cart_item_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at AS item_added_at,
        ci.updated_at AS item_updated_at,
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p.sku AS product_sku,
        p.price AS regular_price,
        p.sale_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.track_inventory,
        p.status AS product_status,
        p.volume,
        p.published_at,
        b.id AS brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        pv.options_key AS variant_options_key,
        pv.price AS variant_price,
        pv.compare_at_price AS variant_compare_at_price,
        pv.image_url AS variant_image_url,
        pv.is_available AS variant_is_available,
        pv.is_active AS variant_is_active,
        COALESCE(
          (
            SELECT string_agg(ov.value, ' / ' ORDER BY po.position ASC)
            FROM variant_option_values vov
            JOIN option_values ov ON ov.id = vov.option_value_id
            JOIN product_options po ON po.id = ov.option_id
            WHERE vov.variant_id = pv.id
          ),
          ''
        ) AS variant_name,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, display_order ASC, created_at ASC 
          LIMIT 1
        ) AS thumbnail_url
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id AND pv.deleted_at IS NULL
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${whereClause}
      ORDER BY ci.created_at ASC;
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Find a single cart item by ID
   */
  async findItemById(id) {
    const sql = `
      SELECT ci.*, p.stock_quantity, p.price, p.sale_price, p.status AS product_status, p.published_at
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find existing cart item for a product & variant
   */
  async findExistingItem({ userId = null, sessionId = null, productId, variantId = null }) {
    let sql = "";
    let params = [];

    if (userId) {
      if (variantId) {
        sql = `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND variant_id = $3 LIMIT 1;`;
        params = [userId, productId, variantId];
      } else {
        sql = `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND variant_id IS NULL LIMIT 1;`;
        params = [userId, productId];
      }
    } else {
      if (variantId) {
        sql = `SELECT * FROM cart_items WHERE session_id = $1 AND user_id IS NULL AND product_id = $2 AND variant_id = $3 LIMIT 1;`;
        params = [sessionId, productId, variantId];
      } else {
        sql = `SELECT * FROM cart_items WHERE session_id = $1 AND user_id IS NULL AND product_id = $2 AND variant_id IS NULL LIMIT 1;`;
        params = [sessionId, productId];
      }
    }

    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Add item to cart or increment quantity if already present
   */
  async addItem({ userId = null, sessionId = null, productId, variantId = null, quantity = 1 }) {
    let sql = "";
    let params = [];

    if (userId) {
      sql = `
        INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE user_id IS NOT NULL
        DO UPDATE SET 
          quantity = cart_items.quantity + EXCLUDED.quantity,
          updated_at = NOW()
        RETURNING *;
      `;
      params = [userId, sessionId, productId, variantId || null, quantity];
    } else {
      sql = `
        INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (session_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE session_id IS NOT NULL AND user_id IS NULL
        DO UPDATE SET 
          quantity = cart_items.quantity + EXCLUDED.quantity,
          updated_at = NOW()
        RETURNING *;
      `;
      params = [null, sessionId, productId, variantId || null, quantity];
    }

    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Update quantity of a specific cart item
   */
  async updateItemQuantity(id, quantity) {
    const sql = `
      UPDATE cart_items 
      SET quantity = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *;
    `;
    const res = await query(sql, [quantity, id]);
    return res.rows[0] || null;
  }

  /**
   * Remove item from cart
   */
  async removeItem(id) {
    const sql = `DELETE FROM cart_items WHERE id = $1 RETURNING *;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Clear all items in cart
   */
  async clearCart({ userId = null, sessionId = null }) {
    let sql = "";
    const params = [];

    if (userId) {
      params.push(userId);
      sql = `DELETE FROM cart_items WHERE user_id = $1 RETURNING id;`;
    } else {
      params.push(sessionId);
      sql = `DELETE FROM cart_items WHERE user_id IS NULL AND session_id = $1 RETURNING id;`;
    }

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Merge guest session items into authenticated user cart upon login
   */
  async mergeGuestCart(userId, sessionId) {
    if (!userId || !sessionId) return;

    // 1. Move or add items from session to user
    const mergeSql = `
      INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
      SELECT $1, product_id, variant_id, quantity 
      FROM cart_items 
      WHERE session_id = $2 AND user_id IS NULL
      ON CONFLICT (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE user_id IS NOT NULL
      DO UPDATE SET 
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    `;
    await query(mergeSql, [userId, sessionId]);

    // 2. Remove old session rows
    const deleteSql = `DELETE FROM cart_items WHERE session_id = $1 AND user_id IS NULL;`;
    await query(deleteSql, [sessionId]);
  }
}

module.exports = new CartRepository();


const { query } = require("../config/db");

class WishlistRepository {
  /**
   * Find paginated wishlist items for a user with live product details, prices, and stock
   */
  async findWishlistItems(userId, { page = 1, limit = 12 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM wishlist_items
       WHERE user_id = $1`,
      [userId]
    );
    const totalItems = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    const sql = `
      SELECT 
        wi.id AS wishlist_item_id,
        wi.product_id,
        wi.variant_id,
        wi.created_at AS added_at,
        p.id AS p_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p.sku AS product_sku,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.track_inventory,
        p.status AS product_status,
        p.published_at,
        b.id AS brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url
      FROM wishlist_items wi
      JOIN products p ON p.id = wi.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC, created_at ASC 
        LIMIT 1
      ) pi ON true
      WHERE wi.user_id = $1
      ORDER BY wi.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const res = await query(sql, [userId, limitNum, offset]);

    const items = res.rows.map((row) => {
      const regularPrice = Number(row.price) || 0;
      const salePrice = row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null;
      const hasDiscount = salePrice !== null && salePrice < regularPrice;
      const currentPrice = hasDiscount ? salePrice : regularPrice;
      const stockQuantity = Number(row.stock_quantity) || 0;
      const isPublished =
        row.product_status === "ACTIVE" &&
        (!row.published_at || new Date(row.published_at) <= new Date());
      const isOutOfStock = !isPublished || (row.track_inventory ? stockQuantity <= 0 : false);

      return {
        id: row.wishlist_item_id,
        productId: row.product_id,
        variantId: row.variant_id || null,
        name: row.product_name,
        slug: row.product_slug,
        sku: row.product_sku,
        regularPrice,
        salePrice,
        currentPrice,
        hasDiscount,
        stockQuantity,
        trackInventory: row.track_inventory,
        inStock: !isOutOfStock,
        isOutOfStock,
        status: row.product_status,
        brand: row.brand_id
          ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug }
          : null,
        brandName: row.brand_name || "Elourá",
        category: row.category_id
          ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
          : null,
        thumbnailUrl: row.thumbnail_url || null,
        addedAt: row.added_at,
      };
    });

    return {
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * Fast list of all product IDs in user's wishlist (for badge and icon hydration)
   */
  async findWishlistProductIds(userId) {
    const res = await query(
      `SELECT product_id FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map((r) => r.product_id);
  }

  /**
   * Find a specific wishlist entry
   */
  async findWishlistItem(userId, productId, variantId = null) {
    let sql = `SELECT * FROM wishlist_items WHERE user_id = $1 AND product_id = $2`;
    const params = [userId, productId];

    if (variantId) {
      sql += ` AND variant_id = $3`;
      params.push(variantId);
    }

    sql += ` LIMIT 1`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Add a product to the user's wishlist (idempotent with ON CONFLICT DO NOTHING)
   */
  async addItem(userId, productId, variantId = null) {
    const sql = `
      INSERT INTO wishlist_items (user_id, product_id, variant_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO NOTHING
      RETURNING *;
    `;
    const res = await query(sql, [userId, productId, variantId]);
    return res.rows[0] || null;
  }

  /**
   * Remove product from the user's wishlist (idempotent)
   */
  async removeItem(userId, productId, variantId = null) {
    let sql = `DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2`;
    const params = [userId, productId];

    if (variantId) {
      sql += ` AND variant_id = $3`;
      params.push(variantId);
    }

    sql += ` RETURNING *;`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  /**
   * Clear all wishlist items for a user
   */
  async clearWishlist(userId) {
    const res = await query(
      `DELETE FROM wishlist_items WHERE user_id = $1 RETURNING id;`,
      [userId]
    );
    return res.rowCount || 0;
  }

  /**
   * Count total wishlist items for a user
   */
  async countWishlist(userId) {
    const res = await query(
      `SELECT COUNT(*)::int AS count FROM wishlist_items WHERE user_id = $1;`,
      [userId]
    );
    return res.rows[0]?.count || 0;
  }

  /**
   * Merge guest product IDs into user's DB wishlist on login
   */
  async mergeGuestItems(userId, productIds = []) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return 0;
    }

    // Filter to valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validIds = [...new Set(productIds.filter((id) => typeof id === "string" && uuidRegex.test(id)))];

    if (validIds.length === 0) return 0;

    // Insert only products that actually exist in the products table
    const sql = `
      INSERT INTO wishlist_items (user_id, product_id)
      SELECT $1, p.id
      FROM products p
      WHERE p.id = ANY($2::uuid[])
      ON CONFLICT (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO NOTHING;
    `;
    const res = await query(sql, [userId, validIds]);
    return res.rowCount || 0;
  }
}

module.exports = new WishlistRepository();


const { query, getClient } = require("../config/db");

class ReviewRepository {
  /**
   * Check if a customer has a delivered order for this product within allowed days
   */
  async findEligibleOrderItem(userId, productId, eligibilityDays = 90) {
    const sql = `
      SELECT 
        oi.id AS order_item_id,
        oi.order_id,
        oi.product_id,
        oi.variant_id,
        oi.product_name,
        oi.sku,
        o.order_number,
        o.status AS order_status,
        o.delivered_at,
        o.placed_at,
        o.updated_at
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = $1 
        AND oi.product_id = $2
        AND o.status = 'delivered'
        AND o.status NOT IN ('cancelled', 'returned')
        AND COALESCE(o.delivered_at, o.updated_at, o.placed_at) >= NOW() - ($3 || ' days')::interval
      ORDER BY COALESCE(o.delivered_at, o.updated_at, o.placed_at) DESC
      LIMIT 1;
    `;
    const res = await query(sql, [userId, productId, eligibilityDays]);
    return res.rows[0] || null;
  }

  /**
   * Find variant info for an order item if variant_id exists
   */
  async getVariantSnapshot(variantId) {
    if (!variantId) return null;
    const sql = `
      SELECT 
        pv.id,
        pv.sku,
        pv.regular_price,
        pv.options_key,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'optionName', po.name,
                'value', ov.value
              )
            )
            FROM variant_option_values vov
            JOIN option_values ov ON ov.id = vov.option_value_id
            JOIN product_options po ON po.id = ov.option_id
            WHERE vov.variant_id = pv.id
          ), '[]'::json
        ) AS selected_options
      FROM product_variants pv
      WHERE pv.id = $1;
    `;
    const res = await query(sql, [variantId]);
    if (!res.rows[0]) return null;

    const row = res.rows[0];
    const options = row.selected_options || [];
    let text = row.options_key || "";
    if (options.length > 0) {
      text = options.map((o) => `${o.optionName}: ${o.value}`).join(", ");
    }
    return {
      variantId,
      optionsKey: row.options_key,
      selectedOptions: options,
      displayText: text || null,
    };
  }

  /**
   * Find an existing review by user and product
   */
  async findByUserAndProduct(userId, productId) {
    const sql = `
      SELECT r.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', ri.id, 'imagePath', ri.image_path, 'publicId', ri.public_id))
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      WHERE r.user_id = $1 AND r.product_id = $2;
    `;
    const res = await query(sql, [userId, productId]);
    return res.rows[0] || null;
  }

  /**
   * Find review by review id
   */
  async findById(reviewId) {
    const sql = `
      SELECT 
        r.*,
        u.name AS user_name,
        u.email AS user_email,
        p.name AS product_name,
        p.slug AS product_slug,
        o.order_number,
        COALESCE(
          (SELECT json_agg(json_build_object('id', ri.id, 'imagePath', ri.image_path, 'publicId', ri.public_id))
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      JOIN products p ON p.id = r.product_id
      JOIN orders o ON o.id = r.order_id
      WHERE r.id = $1;
    `;
    const res = await query(sql, [reviewId]);
    return res.rows[0] || null;
  }

  /**
   * Map existing reviews for order items in a given order
   */
  async findByOrderItems(orderItemIds = []) {
    if (!orderItemIds || orderItemIds.length === 0) return {};
    const sql = `
      SELECT r.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', ri.id, 'imagePath', ri.image_path, 'publicId', ri.public_id))
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      WHERE r.order_item_id = ANY($1::uuid[]);
    `;
    const res = await query(sql, [orderItemIds]);
    const map = {};
    res.rows.forEach((row) => {
      map[row.order_item_id] = row;
    });
    return map;
  }

  /**
   * Get all reviews written by a specific user
   */
  async getMyReviews(userId, { page = 1, limit = 20 } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;
    const countSql = `SELECT COUNT(*) AS total FROM reviews WHERE user_id = $1;`;
    const countRes = await query(countSql, [userId]);
    const total = parseInt(countRes.rows[0].total, 10);

    const sql = `
      SELECT 
        r.*,
        p.name AS product_name,
        p.slug AS product_slug,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) AS product_thumbnail,
        o.order_number,
        COALESCE(
          (SELECT json_agg(json_build_object('id', ri.id, 'imagePath', ri.image_path, 'publicId', ri.public_id))
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      JOIN orders o ON o.id = r.order_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const res = await query(sql, [userId, limit, offset]);
    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
      reviews: res.rows,
    };
  }

  /**
   * Create a new review with images
   */
  async createReview(data, images = [], externalClient = null) {
    const client = externalClient || (await getClient());
    const shouldManageClient = !externalClient;

    try {
      if (shouldManageClient) await client.query("BEGIN");

      const insertReviewSql = `
        INSERT INTO reviews (
          user_id,
          product_id,
          order_id,
          order_item_id,
          variant_info,
          rating,
          comment,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const reviewRes = await client.query(insertReviewSql, [
        data.userId,
        data.productId,
        data.orderId,
        data.orderItemId,
        data.variantInfo ? JSON.stringify(data.variantInfo) : null,
        data.rating,
        data.comment || null,
        data.status || "pending",
      ]);
      const createdReview = reviewRes.rows[0];

      const insertedImages = [];
      if (images && images.length > 0) {
        for (const img of images) {
          const insertImgSql = `
            INSERT INTO review_images (review_id, image_path, public_id)
            VALUES ($1, $2, $3)
            RETURNING id, image_path AS "imagePath", public_id AS "publicId";
          `;
          const imgRes = await client.query(insertImgSql, [
            createdReview.id,
            img.imagePath,
            img.publicId || null,
          ]);
          insertedImages.push(imgRes.rows[0]);
        }
      }

      if (shouldManageClient) await client.query("COMMIT");
      return { ...createdReview, images: insertedImages };
    } catch (err) {
      if (shouldManageClient) await client.query("ROLLBACK");
      throw err;
    } finally {
      if (shouldManageClient) client.release();
    }
  }

  /**
   * Update a rejected review and reset status to pending
   */
  async updateRejectedReview(reviewId, data, newImages = null, externalClient = null) {
    const client = externalClient || (await getClient());
    const shouldManageClient = !externalClient;

    try {
      if (shouldManageClient) await client.query("BEGIN");

      const updateSql = `
        UPDATE reviews
        SET 
          rating = $1,
          comment = $2,
          variant_info = $3,
          status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND user_id = $5
        RETURNING *;
      `;
      const updateRes = await client.query(updateSql, [
        data.rating,
        data.comment || null,
        data.variantInfo ? JSON.stringify(data.variantInfo) : null,
        reviewId,
        data.userId,
      ]);

      if (updateRes.rowCount === 0) {
        throw new Error("Review not found or not owned by user.");
      }

      const updatedReview = updateRes.rows[0];

      // If new images array provided, replace images
      if (Array.isArray(newImages)) {
        await client.query(`DELETE FROM review_images WHERE review_id = $1;`, [reviewId]);
        const insertedImages = [];
        for (const img of newImages) {
          const insertImgSql = `
            INSERT INTO review_images (review_id, image_path, public_id)
            VALUES ($1, $2, $3)
            RETURNING id, image_path AS "imagePath", public_id AS "publicId";
          `;
          const imgRes = await client.query(insertImgSql, [
            reviewId,
            img.imagePath,
            img.publicId || null,
          ]);
          insertedImages.push(imgRes.rows[0]);
        }
        updatedReview.images = insertedImages;
      }

      if (shouldManageClient) await client.query("COMMIT");
      return updatedReview;
    } catch (err) {
      if (shouldManageClient) await client.query("ROLLBACK");
      throw err;
    } finally {
      if (shouldManageClient) client.release();
    }
  }

  /**
   * Public Reviews for PDP: Approved only, rating breakdown, sorting, filtering, photos
   */
  async getPublicProductReviews(productId, { page = 1, limit = 10, sort = "newest", rating = null, withPhotosOnly = false } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;

    // 1. Overall Product Rating & Review Count
    const productStatsSql = `
      SELECT 
        id,
        average_rating,
        review_count
      FROM products
      WHERE id = $1;
    `;
    const prodRes = await query(productStatsSql, [productId]);
    const prod = prodRes.rows[0] || { average_rating: 0.0, review_count: 0 };

    // 2. Rating Breakdown (counts for 1..5 stars for approved reviews)
    const breakdownSql = `
      SELECT 
        rating,
        COUNT(*)::int AS count
      FROM reviews
      WHERE product_id = $1 AND status = 'approved'
      GROUP BY rating;
    `;
    const breakdownRes = await query(breakdownSql, [productId]);
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdownRes.rows.forEach((r) => {
      ratingBreakdown[r.rating] = r.count;
    });

    // 3. Customer Photo Strip: Recent customer photos across all approved reviews for this product
    const photoStripSql = `
      SELECT 
        ri.image_path,
        ri.id AS image_id,
        r.id AS review_id,
        r.rating,
        r.created_at
      FROM review_images ri
      JOIN reviews r ON r.id = ri.review_id
      WHERE r.product_id = $1 AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT 20;
    `;
    const photosRes = await query(photoStripSql, [productId]);
    const photoStrip = photosRes.rows.map((row) => ({
      id: row.image_id,
      reviewId: row.review_id,
      url: row.image_path,
      rating: row.rating,
    }));

    // 4. Build Filtered Query for the reviews list
    const params = [productId];
    let whereClause = `WHERE r.product_id = $1 AND r.status = 'approved'`;

    if (rating && !isNaN(parseInt(rating, 10))) {
      params.push(parseInt(rating, 10));
      whereClause += ` AND r.rating = $${params.length}`;
    }

    if (withPhotosOnly) {
      whereClause += ` AND EXISTS (SELECT 1 FROM review_images ri WHERE ri.review_id = r.id)`;
    }

    // Count matching reviews
    const filteredCountSql = `SELECT COUNT(*) AS total FROM reviews r ${whereClause};`;
    const countRes = await query(filteredCountSql, params);
    const totalMatching = parseInt(countRes.rows[0].total, 10);

    // Sorting
    let orderBy = `r.created_at DESC`;
    if (sort === "highest") {
      orderBy = `r.rating DESC, r.created_at DESC`;
    } else if (sort === "lowest") {
      orderBy = `r.rating ASC, r.created_at DESC`;
    }

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const listSql = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.variant_info,
        r.created_at,
        u.name AS raw_user_name,
        COALESCE(
          (SELECT json_agg(ri.image_path)
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;
    const listRes = await query(listSql, params);

    // Format reviews with masked customer name
    const formattedReviews = listRes.rows.map((row) => {
      const parts = (row.raw_user_name || "Customer").trim().split(/\s+/);
      const firstName = parts[0] || "Customer";
      const lastInitial = parts[1] ? `${parts[1][0].toUpperCase()}.` : "";
      const maskedName = lastInitial ? `${firstName} ${lastInitial}` : firstName;

      // Extract variant string
      let variantText = null;
      if (row.variant_info) {
        if (typeof row.variant_info === "string") {
          variantText = row.variant_info;
        } else if (row.variant_info.displayText) {
          variantText = row.variant_info.displayText;
        } else if (row.variant_info.optionsKey) {
          variantText = row.variant_info.optionsKey;
        }
      }

      return {
        id: row.id,
        user_name: maskedName,
        rating: row.rating,
        comment: row.comment,
        images: row.images || [],
        variant: variantText,
        verified_purchase: true,
        created_at: row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : null,
      };
    });

    return {
      product_id: productId,
      average_rating: parseFloat(prod.average_rating || 0.0),
      review_count: parseInt(prod.review_count || 0, 10),
      rating_breakdown: ratingBreakdown,
      photo_strip: photoStrip,
      total: totalMatching,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(totalMatching / limit) || 1,
      reviews: formattedReviews,
    };
  }

  /**
   * Admin reviews listing with filters and pagination
   */
  async getAdminReviews({ page = 1, limit = 15, status = null, rating = null, search = "", dateFrom = null, dateTo = null } = {}) {
    const offset = (Math.max(1, page) - 1) * limit;
    const params = [];
    const conditions = [];

    if (status && ["pending", "approved", "rejected"].includes(status.toLowerCase())) {
      params.push(status.toLowerCase());
      conditions.push(`r.status = $${params.length}`);
    }

    if (rating && !isNaN(parseInt(rating, 10))) {
      params.push(parseInt(rating, 10));
      conditions.push(`r.rating = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(u.name) LIKE $${params.length} OR 
        LOWER(u.email) LIKE $${params.length} OR 
        LOWER(p.name) LIKE $${params.length} OR
        LOWER(o.order_number) LIKE $${params.length}
      )`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`r.created_at >= $${params.length}::timestamptz`);
    }

    if (dateTo) {
      params.push(dateTo);
      conditions.push(`r.created_at <= $${params.length}::timestamptz`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*) AS total
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      JOIN products p ON p.id = r.product_id
      JOIN orders o ON o.id = r.order_id
      ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const listSql = `
      SELECT 
        r.id,
        r.product_id,
        r.order_id,
        r.order_item_id,
        r.rating,
        r.comment,
        r.status,
        r.rejection_reason,
        r.approved_at,
        r.created_at,
        r.updated_at,
        r.variant_info,
        u.id AS user_id,
        u.name AS customer_name,
        u.email AS customer_email,
        p.name AS product_name,
        p.slug AS product_slug,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) AS product_thumbnail,
        o.order_number,
        (SELECT COUNT(*)::int FROM review_images ri WHERE ri.review_id = r.id) AS image_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', ri.id, 'imagePath', ri.image_path, 'publicId', ri.public_id))
           FROM review_images ri WHERE ri.review_id = r.id), '[]'::json
        ) AS images
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      JOIN products p ON p.id = r.product_id
      JOIN orders o ON o.id = r.order_id
      ${whereClause}
      ORDER BY 
        CASE WHEN r.status = 'pending' THEN 1 ELSE 2 END,
        r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;
    const listRes = await query(listSql, params);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
      reviews: listRes.rows,
    };
  }

  /**
   * Admin KPI metrics
   */
  async getAdminMetrics() {
    const sql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM reviews;
    `;
    const res = await query(sql);
    return res.rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
  }

  /**
   * Pending reviews count for admin sidebar badge
   */
  async getPendingCount() {
    const sql = `SELECT COUNT(*)::int AS pending FROM reviews WHERE status = 'pending';`;
    const res = await query(sql);
    return parseInt(res.rows[0]?.pending || 0, 10);
  }

  /**
   * Approve a review
   */
  async approveReview(reviewId, client = null) {
    const dbClient = client || query;
    const sql = `
      UPDATE reviews
      SET 
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const res = await dbClient.query(sql, [reviewId]);
    return res.rows[0] || null;
  }

  /**
   * Reject a review with required reason
   */
  async rejectReview(reviewId, reason, client = null) {
    const dbClient = client || query;
    const sql = `
      UPDATE reviews
      SET 
        status = 'rejected',
        rejection_reason = $2,
        approved_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const res = await dbClient.query(sql, [reviewId, reason]);
    return res.rows[0] || null;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId, client = null) {
    const dbClient = client || query;
    // Get image public IDs for Cloudinary cleanup before deletion
    const imgSql = `SELECT public_id FROM review_images WHERE review_id = $1 AND public_id IS NOT NULL;`;
    const imgRes = await dbClient.query(imgSql, [reviewId]);
    const publicIds = imgRes.rows.map((r) => r.public_id);

    const delSql = `DELETE FROM reviews WHERE id = $1 RETURNING product_id;`;
    const res = await dbClient.query(delSql, [reviewId]);
    return {
      deleted: res.rowCount > 0,
      productId: res.rows[0]?.product_id || null,
      publicIds,
    };
  }

  /**
   * Bulk approve selected review IDs
   */
  async bulkApprove(reviewIds = [], client = null) {
    const dbClient = client || query;
    const sql = `
      UPDATE reviews
      SET 
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::uuid[]) AND status != 'approved'
      RETURNING id, product_id;
    `;
    const res = await dbClient.query(sql, [reviewIds]);
    return res.rows;
  }

  /**
   * Atomic recalculation of average_rating and review_count on products table
   */
  async recalculateProductRating(productId, client = null) {
    const dbClient = client || query;
    const sql = `
      UPDATE products
      SET 
        average_rating = COALESCE(
          (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE product_id = $1 AND status = 'approved'),
          0.0
        ),
        review_count = (
          SELECT COUNT(*)::int FROM reviews WHERE product_id = $1 AND status = 'approved'
        )
      WHERE id = $1
      RETURNING id, average_rating, review_count;
    `;
    const res = await dbClient.query(sql, [productId]);
    return res.rows[0] || null;
  }
}

module.exports = new ReviewRepository();


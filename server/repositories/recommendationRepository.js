const { query } = require("../config/db");

const recommendationRepository = {
  /**
   * Retrieve active candidate products matching specific categories, brands, or featured status
   * Bounded candidate retrieval to prevent fetching whole database into memory
   */
  async findCandidates({ categoryIds = [], brandIds = [], excludeProductIds = [], limit = 60 }) {
    const conditions = ["p.status = 'ACTIVE'"];
    const values = [];

    // Exclusion filter (e.g. current product or already purchased)
    if (excludeProductIds.length > 0) {
      values.push(excludeProductIds);
      conditions.push(`NOT (p.id = ANY($${values.length}::uuid[]))`);
    }

    const affinityOr = [];
    if (categoryIds.length > 0) {
      values.push(categoryIds);
      affinityOr.push(`p.category_id = ANY($${values.length}::uuid[])`);
    }
    if (brandIds.length > 0) {
      values.push(brandIds);
      affinityOr.push(`p.brand_id = ANY($${values.length}::uuid[])`);
    }

    // Always include featured products as viable high-quality candidates
    affinityOr.push("p.is_featured = true");

    conditions.push(`(${affinityOr.join(" OR ")})`);

    values.push(limit);
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        p.category_id,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_featured,
        p.volume,
        p.skin_type,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${values.length};
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Retrieve curated / featured products (Fallback Step 3)
   */
  async getFeaturedProducts(limit = 12, excludeProductIds = []) {
    const conditions = ["p.status = 'ACTIVE'", "p.is_featured = true"];
    const values = [];

    if (excludeProductIds.length > 0) {
      values.push(excludeProductIds);
      conditions.push(`NOT (p.id = ANY($${values.length}::uuid[]))`);
    }

    values.push(limit);
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        p.category_id,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_featured,
        p.volume,
        p.skin_type,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.created_at DESC
      LIMIT $${values.length};
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Retrieve popular products by interaction volume / views (Fallback Step 4)
   */
  async getPopularProducts(limit = 12, excludeProductIds = []) {
    const conditions = ["p.status = 'ACTIVE'"];
    const values = [];

    if (excludeProductIds.length > 0) {
      values.push(excludeProductIds);
      conditions.push(`NOT (p.id = ANY($${values.length}::uuid[]))`);
    }

    values.push(limit);
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        p.category_id,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_featured,
        p.volume,
        p.skin_type,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url,
        COUNT(i.id)::int AS interaction_count
      FROM products p
      LEFT JOIN interactions i ON i.product_id = p.id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE ${conditions.join(" AND ")}
      GROUP BY p.id, b.name, b.slug, c.name, c.slug, pi.image_url
      ORDER BY interaction_count DESC, p.is_featured DESC, p.created_at DESC
      LIMIT $${values.length};
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Retrieve recent active products (Fallback Step 5)
   */
  async getRecentProducts(limit = 12, excludeProductIds = []) {
    const conditions = ["p.status = 'ACTIVE'"];
    const values = [];

    if (excludeProductIds.length > 0) {
      values.push(excludeProductIds);
      conditions.push(`NOT (p.id = ANY($${values.length}::uuid[]))`);
    }

    values.push(limit);
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        p.category_id,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_featured,
        p.volume,
        p.skin_type,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.created_at DESC
      LIMIT $${values.length};
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  /**
   * Retrieve related products for a specific product ID (by Category, Brand, Collection)
   */
  async getRelatedProducts({ productId, categoryId = null, brandId = null, limit = 8 }) {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        p.category_id,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.is_featured,
        p.volume,
        p.skin_type,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url,
        (
          (CASE WHEN p.category_id = $2 THEN 3.0 ELSE 0.0 END) +
          (CASE WHEN p.brand_id = $3 THEN 2.0 ELSE 0.0 END) +
          (CASE WHEN p.is_featured = true THEN 0.5 ELSE 0.0 END)
        ) AS relevance_score
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE p.status = 'ACTIVE' 
        AND p.id != $1
        AND (
          ($2::uuid IS NOT NULL AND p.category_id = $2)
          OR ($3::uuid IS NOT NULL AND p.brand_id = $3)
          OR p.is_featured = true
        )
      ORDER BY relevance_score DESC, p.is_featured DESC, p.created_at DESC
      LIMIT $4;
    `;

    const res = await query(sql, [productId, categoryId, brandId, limit]);
    return res.rows;
  },

  /**
   * Get collection IDs for a set of product IDs
   */
  async getCollectionsForProducts(productIds = []) {
    if (productIds.length === 0) return {};

    const sql = `
      SELECT product_id, collection_id 
      FROM product_collections 
      WHERE product_id = ANY($1::uuid[]);
    `;
    const res = await query(sql, [productIds]);
    const mapping = {};
    res.rows.forEach((r) => {
      if (!mapping[r.product_id]) mapping[r.product_id] = [];
      mapping[r.product_id].push(r.collection_id);
    });
    return mapping;
  },
};

module.exports = recommendationRepository;


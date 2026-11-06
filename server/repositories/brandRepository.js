const { query } = require("../config/db");

const brandRepository = {
  /**
   * Helper to check if the products table exists in the database
   */
  async checkProductsTableExists() {
    try {
      const res = await query("SELECT to_regclass('public.products') AS exists;");
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  },

  async checkBrandSalesTablesExist() {
    try {
      const res = await query(`
        SELECT
          to_regclass('public.products') IS NOT NULL AS products,
          to_regclass('public.orders') IS NOT NULL AS orders,
          to_regclass('public.order_items') IS NOT NULL AS order_items;
      `);
      const tables = res.rows[0];
      return Boolean(tables?.products && tables?.orders && tables?.order_items);
    } catch {
      return false;
    }
  },

  /**
   * Find paginated brands with search, filters, sorting, and product count
   */
  async findAll({
    search = "",
    status = "all",
    isFeatured = "all",
    letter = "",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];

    // Search filter
    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const searchIndex = values.length;
      conditions.push(
        `(LOWER(b.name) LIKE $${searchIndex} OR LOWER(b.slug) LIKE $${searchIndex} OR LOWER(COALESCE(b.description, '')) LIKE $${searchIndex} OR LOWER(COALESCE(b.website_url, '')) LIKE $${searchIndex})`
      );
    }

    // Letter filter (e.g. for A-Z directory)
    if (letter && letter.trim() && letter.trim().toLowerCase() !== "all") {
      values.push(`${letter.trim().toLowerCase()}%`);
      conditions.push(`LOWER(b.name) LIKE $${values.length}`);
    }

    // Status filter
    if (status === "active") {
      conditions.push("b.is_active = true");
    } else if (status === "inactive") {
      conditions.push("b.is_active = false");
    }

    // Featured filter
    if (isFeatured === "true" || isFeatured === true) {
      conditions.push("b.is_featured = true");
    } else if (isFeatured === "false" || isFeatured === false) {
      conditions.push("b.is_featured = false");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Allowed sort columns
    const allowedSortColumns = {
      name: "b.name",
      created_at: "b.created_at",
      updated_at: "b.updated_at",
      is_active: "b.is_active",
      is_featured: "b.is_featured",
      product_count: "product_count",
      sales: "b.sales_count",
      sales_count: "b.sales_count",
    };

    let sortClause;
    if (sortBy === "sales" || sortBy === "sales_count") {
      const dir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      // If same sales count, break tie lexicographically by name ASC
      sortClause = `b.sales_count ${dir}, b.name ASC`;
    } else {
      const sortCol = allowedSortColumns[sortBy] || "b.created_at";
      const sortDir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
      sortClause = `${sortCol} ${sortDir}`;
    }

    const hasProducts = await this.checkProductsTableExists();

    let sql;
    if (hasProducts) {
      sql = `
        SELECT 
          b.id,
          b.name,
          b.slug,
          b.tagline,
          b.description,
          b.logo_url,
          b.logo_public_id,
          b.website_url,
          b.is_active,
          b.is_featured,
          b.sales_count,
          b.created_at,
          b.updated_at,
          COUNT(p.id)::int AS product_count
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id
        ${whereClause}
        GROUP BY b.id
        ORDER BY ${sortClause}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2};
      `;
    } else {
      sql = `
        SELECT 
          b.id,
          b.name,
          b.slug,
          b.tagline,
          b.description,
          b.logo_url,
          b.logo_public_id,
          b.website_url,
          b.is_active,
          b.is_featured,
          b.sales_count,
          b.created_at,
          b.updated_at,
          0 AS product_count
        FROM brands b
        ${whereClause}
        ORDER BY ${sortClause}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2};
      `;
    }

    const queryValues = [...values, limitNum, offset];
    const res = await query(sql, queryValues);

    return res.rows;
  },

  /**
   * Count total brands matching filters
   */
  async countFiltered({ search = "", status = "all", isFeatured = "all", letter = "" }) {
    const conditions = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const searchIndex = values.length;
      conditions.push(
        `(LOWER(name) LIKE $${searchIndex} OR LOWER(slug) LIKE $${searchIndex} OR LOWER(COALESCE(description, '')) LIKE $${searchIndex} OR LOWER(COALESCE(website_url, '')) LIKE $${searchIndex})`
      );
    }

    if (letter && letter.trim() && letter.trim().toLowerCase() !== "all") {
      values.push(`${letter.trim().toLowerCase()}%`);
      conditions.push(`LOWER(name) LIKE $${values.length}`);
    }

    if (status === "active") {
      conditions.push("is_active = true");
    } else if (status === "inactive") {
      conditions.push("is_active = false");
    }

    if (isFeatured === "true" || isFeatured === true) {
      conditions.push("is_featured = true");
    } else if (isFeatured === "false" || isFeatured === false) {
      conditions.push("is_featured = false");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT COUNT(*)::int AS total FROM brands ${whereClause};`;
    const res = await query(sql, values);

    return res.rows[0]?.total || 0;
  },

  /**
   * Rank active brands by units in currently delivered orders; unsold brands have zero units.
   */
  async getTopBrands(limit = 3) {
    if (!(await this.checkBrandSalesTablesExist())) return [];

    const res = await query(
      `WITH brand_products AS (
         SELECT brand_id, COUNT(*)::int AS product_count
         FROM products
         WHERE brand_id IS NOT NULL
         GROUP BY brand_id
       ), delivered_brand_sales AS (
         SELECT p.brand_id, SUM(oi.quantity)::bigint AS units_sold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.order_status = 'DELIVERED'
         JOIN products p ON p.id = oi.product_id
         WHERE p.brand_id IS NOT NULL
         GROUP BY p.brand_id
       )
       SELECT
         b.id,
         b.name,
         b.slug,
         b.tagline,
         b.description,
         b.logo_url,
         b.logo_public_id,
         b.website_url,
         b.is_active,
         b.is_featured,
         COALESCE(sales.units_sold, 0)::bigint AS sales_count,
         b.created_at,
         b.updated_at,
         COALESCE(products.product_count, 0)::int AS product_count,
         (
           SELECT pi.image_url
           FROM product_images pi
           JOIN products p ON p.id = pi.product_id
           WHERE p.brand_id = b.id AND p.status = 'ACTIVE'
           ORDER BY pi.is_primary DESC, pi.display_order ASC
           LIMIT 1
         ) AS sample_product_image
       FROM brands b
       LEFT JOIN brand_products products ON products.brand_id = b.id
       LEFT JOIN delivered_brand_sales sales ON sales.brand_id = b.id
       WHERE b.is_active = true
       ORDER BY COALESCE(sales.units_sold, 0) DESC, LOWER(b.name) ASC, b.name ASC, b.slug ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  /**
   * Get summary statistics across all brands (Total, Active, Inactive, Featured, Total Products)
   */
  async getSummaryCounts() {
    const hasProducts = await this.checkProductsTableExists();

    let totalProducts = 0;
    if (hasProducts) {
      try {
        const prodRes = await query("SELECT COUNT(*)::int AS count FROM products WHERE brand_id IS NOT NULL;");
        totalProducts = prodRes.rows[0]?.count || 0;
      } catch {
        totalProducts = 0;
      }
    }

    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE is_active = false)::int AS inactive,
        COUNT(*) FILTER (WHERE is_featured = true)::int AS featured
      FROM brands;
    `;
    const res = await query(sql);
    const row = res.rows[0] || {};

    return {
      total: row.total || 0,
      active: row.active || 0,
      inactive: row.inactive || 0,
      featured: row.featured || 0,
      totalProducts,
    };
  },

  /**
   * Find a single brand by ID
   */
  async findById(id) {
    const hasProducts = await this.checkProductsTableExists();

    let sql;
    if (hasProducts) {
      sql = `
        SELECT 
          b.id,
          b.name,
          b.slug,
          b.tagline,
          b.description,
          b.logo_url,
          b.logo_public_id,
          b.website_url,
          b.is_active,
          b.is_featured,
          b.sales_count,
          b.created_at,
          b.updated_at,
          COUNT(p.id)::int AS product_count
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id
        WHERE b.id = $1
        GROUP BY b.id
        LIMIT 1;
      `;
    } else {
      sql = `
        SELECT 
          b.id,
          b.name,
          b.slug,
          b.tagline,
          b.description,
          b.logo_url,
          b.logo_public_id,
          b.website_url,
          b.is_active,
          b.is_featured,
          b.sales_count,
          b.created_at,
          b.updated_at,
          0 AS product_count
        FROM brands b
        WHERE b.id = $1
        LIMIT 1;
      `;
    }

    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find brand by slug, optionally excluding an ID (for update collision check)
   */
  async findBySlug(slug, excludeId = null) {
    if (excludeId) {
      const sql = `SELECT * FROM brands WHERE slug = $1 AND id != $2 LIMIT 1;`;
      const res = await query(sql, [slug, excludeId]);
      return res.rows[0] || null;
    }
    const sql = `SELECT * FROM brands WHERE slug = $1 LIMIT 1;`;
    const res = await query(sql, [slug]);
    return res.rows[0] || null;
  },

  /**
   * Check if brand has associated products
   */
  async hasLinkedProducts(id) {
    const hasProducts = await this.checkProductsTableExists();
    if (!hasProducts) return false;

    try {
      const sql = `SELECT COUNT(*)::int AS count FROM products WHERE brand_id = $1;`;
      const res = await query(sql, [id]);
      return (res.rows[0]?.count || 0) > 0;
    } catch {
      return false;
    }
  },

  /**
   * Insert new brand
   */
  async create({
    name,
    slug,
    tagline = null,
    description = null,
    logoUrl = null,
    logoPublicId = null,
    websiteUrl = null,
    isActive = true,
    isFeatured = false,
    salesCount = 0,
  }, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      INSERT INTO brands (
        name,
        slug,
        tagline,
        description,
        logo_url,
        logo_public_id,
        website_url,
        is_active,
        is_featured,
        sales_count,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      name,
      slug,
      tagline,
      description,
      logoUrl,
      logoPublicId,
      websiteUrl,
      isActive,
      isFeatured,
      salesCount,
    ];

    const res = await executor.query(sql, values);
    return res.rows[0];
  },

  /**
   * Update brand dynamically
   */
  async update(id, updates = {}, dbClient = null) {
    const executor = dbClient || { query };
    const setClauses = [];
    const values = [];

    const fieldMap = {
      name: "name",
      slug: "slug",
      tagline: "tagline",
      description: "description",
      logoUrl: "logo_url",
      logoPublicId: "logo_public_id",
      websiteUrl: "website_url",
      isActive: "is_active",
      isFeatured: "is_featured",
      salesCount: "sales_count",
    };

    for (const [key, dbColumn] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        values.push(updates[key]);
        setClauses.push(`${dbColumn} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE brands
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const res = await executor.query(sql, values);
    return res.rows[0];
  },

  /**
   * Delete brand by ID
   */
  async delete(id, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `DELETE FROM brands WHERE id = $1 RETURNING *;`;
    const res = await executor.query(sql, [id]);
    return res.rows[0];
  },
};

module.exports = brandRepository;


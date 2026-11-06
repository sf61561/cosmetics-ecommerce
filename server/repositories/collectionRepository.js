const { query } = require("../config/db");

const collectionRepository = {
  /**
   * Find paginated collections with filters and product count
   */
  async findAll({
    search = "",
    status = "all",
    tag = "",
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
        `(LOWER(c.name) LIKE $${searchIndex} OR LOWER(c.slug) LIKE $${searchIndex} OR LOWER(COALESCE(c.description, '')) LIKE $${searchIndex})`
      );
    }

    // Status filter
    if (status === "active") {
      conditions.push("c.is_active = true");
    } else if (status === "inactive") {
      conditions.push("c.is_active = false");
    }

    // Tag filter
    if (tag && tag.trim() && tag !== "all") {
      values.push(`%${tag.trim().toLowerCase()}%`);
      const tagIndex = values.length;
      conditions.push(
        `(LOWER(c.name) LIKE $${tagIndex} OR LOWER(c.slug) LIKE $${tagIndex} OR LOWER(COALESCE(c.description, '')) LIKE $${tagIndex} OR EXISTS (
           SELECT 1 FROM product_collections pc2
           JOIN product_tags pt ON pt.product_id = pc2.product_id
           JOIN tags t ON t.id = pt.tag_id
           WHERE pc2.collection_id = c.id AND (LOWER(t.name) LIKE $${tagIndex} OR LOWER(t.slug) LIKE $${tagIndex})
         ))`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Allowed sort columns
    const allowedSortColumns = {
      name: "c.name",
      created_at: "c.created_at",
      updated_at: "c.updated_at",
      is_active: "c.is_active",
      product_count: "product_count",
      sales: "c.sales_count",
      sales_count: "c.sales_count",
      popularity: "c.sales_count",
      display_order: "c.display_order",
    };
    const sortCol = allowedSortColumns[sortBy] || "c.created_at";
    const sortDir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.image_public_id,
        c.is_active,
        c.sales_count,
        c.is_featured,
        c.display_order,
        c.created_at,
        c.updated_at,
        COUNT(pc.product_id)::int AS product_count
      FROM collections c
      LEFT JOIN product_collections pc ON pc.collection_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `;

    const queryValues = [...values, limitNum, offset];
    const res = await query(sql, queryValues);

    return res.rows;
  },

  /**
   * Count total collections matching search & status filters
   */
  async countFiltered({ search = "", status = "all", tag = "" }) {
    const conditions = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const searchIndex = values.length;
      conditions.push(
        `(LOWER(c.name) LIKE $${searchIndex} OR LOWER(c.slug) LIKE $${searchIndex} OR LOWER(COALESCE(c.description, '')) LIKE $${searchIndex})`
      );
    }

    if (status === "active") {
      conditions.push("c.is_active = true");
    } else if (status === "inactive") {
      conditions.push("c.is_active = false");
    }

    if (tag && tag.trim() && tag !== "all") {
      values.push(`%${tag.trim().toLowerCase()}%`);
      const tagIndex = values.length;
      conditions.push(
        `(LOWER(c.name) LIKE $${tagIndex} OR LOWER(c.slug) LIKE $${tagIndex} OR LOWER(COALESCE(c.description, '')) LIKE $${tagIndex} OR EXISTS (
           SELECT 1 FROM product_collections pc2
           JOIN product_tags pt ON pt.product_id = pc2.product_id
           JOIN tags t ON t.id = pt.tag_id
           WHERE pc2.collection_id = c.id AND (LOWER(t.name) LIKE $${tagIndex} OR LOWER(t.slug) LIKE $${tagIndex})
         ))`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT COUNT(*)::int AS total FROM collections c ${whereClause};`;
    const res = await query(sql, values);

    return res.rows[0]?.total || 0;
  },

  /**
   * Get summary counts (total, active, inactive) across all collections
   */
  async getSummaryCounts() {
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE is_active = false)::int AS inactive
      FROM collections;
    `;
    const res = await query(sql);
    return res.rows[0] || { total: 0, active: 0, inactive: 0 };
  },

  /**
   * Find a collection by ID
   */
  async findById(id) {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.image_public_id,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(pc.product_id)::int AS product_count
      FROM collections c
      LEFT JOIN product_collections pc ON pc.collection_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find by slug (optionally excluding a specific ID for updates)
   */
  async findBySlug(slug, excludeId = null) {
    let sql = "SELECT id, name, slug, description, image_url, image_public_id, is_active FROM collections WHERE LOWER(slug) = LOWER($1)";
    const values = [slug];

    if (excludeId) {
      sql += " AND id != $2";
      values.push(excludeId);
    }

    sql += " LIMIT 1;";
    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Find public collection with active products
   */
  async findPublicBySlug(slug) {
    const colSql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.image_public_id,
        c.is_active,
        c.sales_count,
        c.created_at,
        COUNT(pc.product_id)::int AS product_count
      FROM collections c
      LEFT JOIN product_collections pc ON pc.collection_id = c.id
      WHERE LOWER(c.slug) = LOWER($1) AND c.is_active = true
      GROUP BY c.id
      LIMIT 1;
    `;
    const colRes = await query(colSql, [slug]);
    const collection = colRes.rows[0];
    if (!collection) return null;

    // Fetch associated active products
    const prodSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.skin_type,
        pi.image_url AS thumbnail_url
      FROM products p
      JOIN product_collections pc ON pc.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE pc.collection_id = $1 AND p.status = 'ACTIVE'
      ORDER BY p.created_at DESC
      LIMIT 24;
    `;
    const prodRes = await query(prodSql, [collection.id]);

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description || "",
      imageUrl: collection.image_url,
      imagePublicId: collection.image_public_id,
      salesCount: parseInt(collection.sales_count, 10) || 0,
      productCount: parseInt(collection.product_count, 10) || 0,
      products: prodRes.rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: parseFloat(p.price),
        salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
        stockQuantity: p.stock_quantity,
        skinType: p.skin_type,
        thumbnailUrl: p.thumbnail_url || null,
      })),
    };
  },

  /**
   * Create a new collection
   */
  async create({
    name,
    slug,
    description = null,
    imageUrl = null,
    imagePublicId = null,
    isActive = true,
  }, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      INSERT INTO collections (
        name,
        slug,
        description,
        image_url,
        image_public_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING 
        id,
        name,
        slug,
        description,
        image_url,
        image_public_id,
        is_active,
        created_at,
        updated_at;
    `;
    const values = [name, slug, description, imageUrl, imagePublicId, isActive];
    const res = await executor.query(sql, values);
    return { ...res.rows[0], product_count: 0 };
  },

  /**
   * Update an existing collection
   */
  async update(
    id,
    { name, slug, description, imageUrl, imagePublicId, isActive }, dbClient = null
  ) {
    const executor = dbClient || { query };
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (slug !== undefined) {
      fields.push(`slug = $${idx++}`);
      values.push(slug);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(imageUrl);
    }
    if (imagePublicId !== undefined) {
      fields.push(`image_public_id = $${idx++}`);
      values.push(imagePublicId);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    fields.push("updated_at = NOW()");

    values.push(id);
    const sql = `
      UPDATE collections
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING 
        id,
        name,
        slug,
        description,
        image_url,
        image_public_id,
        is_active,
        created_at,
        updated_at;
    `;

    const res = await executor.query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Count associated products for a collection
   */
  async countAssociatedProducts(collectionId) {
    const sql = `
      SELECT COUNT(*)::int AS count 
      FROM product_collections 
      WHERE collection_id = $1;
    `;
    const res = await query(sql, [collectionId]);
    return res.rows[0]?.count || 0;
  },

  /**
   * Delete a collection by ID
   */
  async delete(id, dbClient = null) {
    const executor = dbClient || { query };
    const sql = "DELETE FROM collections WHERE id = $1 RETURNING id, name, image_public_id;";
    const res = await executor.query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Check if an image public ID is referenced by other collections
   */
  async isImageReferencedElsewhere(publicId, excludeCollectionId = null) {
    if (!publicId) return false;
    let sql = "SELECT id FROM collections WHERE image_public_id = $1";
    const values = [publicId];

    if (excludeCollectionId) {
      sql += " AND id != $2";
      values.push(excludeCollectionId);
    }

    sql += " LIMIT 1;";
    const res = await query(sql, values);
    return res.rows.length > 0;
  },
};

module.exports = collectionRepository;


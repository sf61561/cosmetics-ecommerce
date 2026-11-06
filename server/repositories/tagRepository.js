const { query } = require("../config/db");

function mapTag(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    productCount: row.product_count !== undefined ? Number(row.product_count) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const tagRepository = {
  /**
   * Create a new tag
   */
  async create({ name, slug, description = null }) {
    const text = `
      INSERT INTO tags (name, slug, description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [name.trim(), slug.trim().toLowerCase(), description ? description.trim() : null];
    const res = await query(text, values);
    return mapTag(res.rows[0]);
  },

  /**
   * Find paginated tags with search and product count
   */
  async findAll({
    search = "",
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "DESC",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;
      conditions.push(`(t.name ILIKE $${searchIndex} OR t.slug ILIKE $${searchIndex} OR t.description ILIKE $${searchIndex})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortFields = {
      created_at: "t.created_at",
      name: "t.name",
      slug: "t.slug",
      product_count: "product_count",
    };
    const sortField = allowedSortFields[sortBy] || "t.created_at";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tags t
      ${whereClause};
    `;
    const countRes = await query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    // Data query with left join on product_tags
    const dataValues = [...values, limitNum, offset];
    const dataQuery = `
      SELECT
        t.*,
        COUNT(pt.product_id)::int AS product_count
      FROM tags t
      LEFT JOIN product_tags pt ON t.id = pt.tag_id
      ${whereClause}
      GROUP BY t.id
      ORDER BY ${sortField} ${orderDirection}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;
    const dataRes = await query(dataQuery, dataValues);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      tags: dataRes.rows.map(mapTag),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  },

  /**
   * Find tag by ID
   */
  async findById(id) {
    const text = `
      SELECT
        t.*,
        COUNT(pt.product_id)::int AS product_count
      FROM tags t
      LEFT JOIN product_tags pt ON t.id = pt.tag_id
      WHERE t.id = $1
      GROUP BY t.id;
    `;
    const res = await query(text, [id]);
    return mapTag(res.rows[0]);
  },

  /**
   * Find tag by Name (case-insensitive)
   */
  async findByName(name, excludeId = null) {
    let text = "SELECT * FROM tags WHERE LOWER(name) = LOWER($1)";
    const values = [name.trim()];
    if (excludeId) {
      text += " AND id != $2";
      values.push(excludeId);
    }
    const res = await query(text, values);
    return mapTag(res.rows[0]);
  },

  /**
   * Find tag by Slug (case-insensitive)
   */
  async findBySlug(slug, excludeId = null) {
    let text = "SELECT * FROM tags WHERE LOWER(slug) = LOWER($1)";
    const values = [slug.trim().toLowerCase()];
    if (excludeId) {
      text += " AND id != $2";
      values.push(excludeId);
    }
    const res = await query(text, values);
    return mapTag(res.rows[0]);
  },

  /**
   * Update tag
   */
  async update(id, { name, slug, description }) {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      values.push(name.trim());
      fields.push(`name = $${values.length}`);
    }

    if (slug !== undefined) {
      values.push(slug.trim().toLowerCase());
      fields.push(`slug = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description ? description.trim() : null);
      fields.push(`description = $${values.length}`);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const text = `
      UPDATE tags
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING *;
    `;
    const res = await query(text, values);
    return mapTag(res.rows[0]);
  },

  /**
   * Delete tag
   */
  async delete(id) {
    const text = `
      DELETE FROM tags
      WHERE id = $1
      RETURNING id;
    `;
    const res = await query(text, [id]);
    return Boolean(res.rowCount);
  },

  /**
   * Get total count
   */
  async count() {
    const res = await query("SELECT COUNT(*)::int AS total FROM tags;");
    return Number(res.rows[0]?.total || 0);
  },
};

module.exports = tagRepository;


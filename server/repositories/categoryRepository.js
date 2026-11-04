const { query } = require("../config/db");

const categoryRepository = {
  /**
   * List all categories (for dropdowns and filters)
   */
  async findAll({ activeOnly = false } = {}) {
    let sql = `
      SELECT id, name, slug, description, image_url, is_active, display_order, created_at
      FROM categories
    `;
    if (activeOnly) {
      sql += ` WHERE is_active = true`;
    }
    sql += ` ORDER BY display_order ASC, name ASC;`;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Find category by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM categories WHERE id = $1 LIMIT 1;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find category by Slug
   */
  async findBySlug(slug) {
    const sql = `SELECT * FROM categories WHERE slug = $1 LIMIT 1;`;
    const res = await query(sql, [slug]);
    return res.rows[0] || null;
  },
};

module.exports = categoryRepository;


const { query } = require("../config/db");

function mapProductRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    productName: row.product_name,
    variantText: row.variant_text,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    sourceUrl: row.source_url,
    notes: row.notes,
    status: row.status,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userAccountName: row.user_account_name || null,
    userAccountEmail: row.user_account_email || null,
  };
}

const productRequestRepository = {
  /**
   * Create a new product request
   */
  async create({
    userId = null,
    productName,
    variantText = null,
    customerPhone,
    customerEmail = null,
    customerName = null,
    sourceUrl = null,
    notes = null,
  }) {
    const text = `
      INSERT INTO product_requests (
        user_id,
        product_name,
        variant_text,
        customer_phone,
        customer_email,
        customer_name,
        source_url,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      userId,
      productName.trim(),
      variantText ? variantText.trim() : null,
      customerPhone.trim(),
      customerEmail ? customerEmail.trim().toLowerCase() : null,
      customerName ? customerName.trim() : null,
      sourceUrl ? sourceUrl.trim() : null,
      notes ? notes.trim() : null,
    ];
    const res = await query(text, values);
    return mapProductRequest(res.rows[0]);
  },

  /**
   * Find paginated product requests with filters, search, and sorting
   */
  async findAll({
    search = "",
    status = "all",
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

    if (status && status !== "all") {
      values.push(status.toUpperCase());
      conditions.push(`pr.status = $${values.length}`);
    }

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;
      conditions.push(`(
        pr.product_name ILIKE $${searchIndex}
        OR pr.variant_text ILIKE $${searchIndex}
        OR pr.customer_phone ILIKE $${searchIndex}
        OR pr.customer_email ILIKE $${searchIndex}
        OR pr.customer_name ILIKE $${searchIndex}
        OR pr.notes ILIKE $${searchIndex}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortFields = {
      created_at: "pr.created_at",
      product_name: "pr.product_name",
      status: "pr.status",
      customer_phone: "pr.customer_phone",
    };
    const sortField = allowedSortFields[sortBy] || "pr.created_at";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM product_requests pr
      ${whereClause};
    `;
    const countRes = await query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    // Data query with optional joined user
    const dataValues = [...values, limitNum, offset];
    const dataQuery = `
      SELECT
        pr.*,
        u.name AS user_account_name,
        u.email AS user_account_email
      FROM product_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      ${whereClause}
      ORDER BY ${sortField} ${orderDirection}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;
    const dataRes = await query(dataQuery, dataValues);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      requests: dataRes.rows.map(mapProductRequest),
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
   * Find single product request by ID
   */
  async findById(id) {
    const text = `
      SELECT
        pr.*,
        u.name AS user_account_name,
        u.email AS user_account_email
      FROM product_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.id = $1;
    `;
    const res = await query(text, [id]);
    return mapProductRequest(res.rows[0]);
  },

  /**
   * Update request status and/or admin notes
   */
  async updateStatus(id, { status, adminNotes = null }) {
    const fields = [];
    const values = [];

    if (status) {
      values.push(status.toUpperCase());
      fields.push(`status = $${values.length}`);
    }

    if (adminNotes !== undefined) {
      values.push(adminNotes ? adminNotes.trim() : null);
      fields.push(`admin_notes = $${values.length}`);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const text = `
      UPDATE product_requests
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING *;
    `;
    const res = await query(text, values);
    return mapProductRequest(res.rows[0]);
  },

  /**
   * Delete a product request
   */
  async delete(id) {
    const text = `
      DELETE FROM product_requests
      WHERE id = $1
      RETURNING id;
    `;
    const res = await query(text, [id]);
    return Boolean(res.rowCount);
  },

  /**
   * Get KPI metrics across statuses
   */
  async getMetrics() {
    const text = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'FULFILLED')::int AS fulfilled,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
      FROM product_requests;
    `;
    const res = await query(text);
    const row = res.rows[0] || {};
    return {
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      inProgress: Number(row.in_progress || 0),
      fulfilled: Number(row.fulfilled || 0),
      rejected: Number(row.rejected || 0),
    };
  },
};

module.exports = productRequestRepository;


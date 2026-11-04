const { query } = require("../config/db");

const customerRepository = {
  /**
   * Find paginated customers with search, filters, order aggregations, and sorting
   */
  async findCustomers({
    search = "",
    status = "all",
    hasOrders = "all",
    startDate = null,
    endDate = null,
    sortBy = "created_at",
    sortOrder = "DESC",
    page = 1,
    limit = 10,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["u.role = 'CUSTOMER'"];
    const values = [];

    // Search filter across name, email, and phone
    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const idx = values.length;
      conditions.push(
        `(LOWER(u.name) LIKE $${idx} OR LOWER(COALESCE(u.email, '')) LIKE $${idx} OR LOWER(COALESCE(u.phone, '')) LIKE $${idx})`
      );
    }

    // Status filter
    if (status && status !== "all") {
      values.push(status.toUpperCase());
      conditions.push(`u.status = $${values.length}`);
    }

    // Date range filters
    if (startDate) {
      values.push(new Date(startDate));
      conditions.push(`u.created_at >= $${values.length}`);
    }
    if (endDate) {
      values.push(new Date(endDate));
      conditions.push(`u.created_at <= $${values.length}`);
    }

    // Has Orders filter
    if (hasOrders === "yes") {
      conditions.push(
        `EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED'))`
      );
    } else if (hasOrders === "no") {
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED'))`
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Allowed sortable columns mapping
    const allowedSortFields = {
      created_at: "u.created_at",
      name: "u.name",
      email: "u.email",
      order_count: "order_count",
      total_spent: "total_spent",
    };
    const sortColumn = allowedSortFields[sortBy] || "u.created_at";
    const direction = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause};
    `;
    const countRes = await query(countSql, values);
    const totalItems = parseInt(countRes.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    // Data query with subquery order aggregates
    const dataValues = [...values, limitNum, offset];
    const dataSql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.profile_picture_link,
        u.email_verified_at,
        u.authprovider,
        u.created_at,
        u.updated_at,
        COALESCE(ord.order_count, 0)::int AS order_count,
        COALESCE(ord.total_spent, 0.00)::numeric(10, 2) AS total_spent,
        ord.last_order_date
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE order_status NOT IN ('CANCELLED', 'RETURNED')) AS order_count,
          SUM(total_amount) FILTER (WHERE order_status = 'DELIVERED') AS total_spent,
          MAX(created_at) AS last_order_date
        FROM orders
        GROUP BY user_id
      ) ord ON ord.user_id = u.id
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}, u.id DESC
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;

    const dataRes = await query(dataSql, dataValues);

    return {
      customers: dataRes.rows.map((r) => this.formatCustomerListItem(r)),
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  },

  /**
   * Get dynamic summary KPI counts for admin dashboard
   */
  async getSummaryCounts() {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND status = 'ACTIVE') AS active_customers,
        (
          SELECT COUNT(DISTINCT user_id) 
          FROM orders 
          WHERE user_id IS NOT NULL 
            AND order_status NOT IN ('CANCELLED', 'RETURNED')
        ) AS customers_with_orders,
        (
          SELECT COUNT(*) 
          FROM users 
          WHERE role = 'CUSTOMER' 
            AND created_at >= NOW() - INTERVAL '30 days'
        ) AS new_customers;
    `;
    const res = await query(sql);
    const row = res.rows[0] || {};
    return {
      totalCustomers: parseInt(row.total_customers || 0, 10),
      activeCustomers: parseInt(row.active_customers || 0, 10),
      customersWithOrders: parseInt(row.customers_with_orders || 0, 10),
      newCustomers: parseInt(row.new_customers || 0, 10),
    };
  },

  /**
   * Find single customer details by ID with complete stats
   */
  async findById(id) {
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.profile_picture_link,
        u.email_verified_at,
        u.authprovider,
        u.created_at,
        u.updated_at,
        COALESCE(ord.order_count, 0)::int AS order_count,
        COALESCE(ord.total_spent, 0.00)::numeric(10, 2) AS total_spent,
        ord.last_order_date,
        COALESCE(w.wishlist_count, 0)::int AS wishlist_count
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE order_status NOT IN ('CANCELLED', 'RETURNED')) AS order_count,
          SUM(total_amount) FILTER (WHERE order_status = 'DELIVERED') AS total_spent,
          MAX(created_at) AS last_order_date
        FROM orders
        GROUP BY user_id
      ) ord ON ord.user_id = u.id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*)::int AS wishlist_count
        FROM wishlist_items
        GROUP BY user_id
      ) w ON w.user_id = u.id
      WHERE u.id = $1 AND u.role = 'CUSTOMER'
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    if (!res.rows[0]) return null;
    return this.formatCustomerListItem(res.rows[0]);
  },

  /**
   * Find customer by raw ID without role restriction (used for internal guard checks)
   */
  async findAnyUserById(id) {
    const sql = `
      SELECT id, name, email, phone, role, status 
      FROM users 
      WHERE id = $1 
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Update permitted profile fields for customer (name, phone)
   */
  async updateProfile(id, { name, phone }, dbClient = null) {
    const executor = dbClient || { query };
    const fields = [];
    const values = [];

    if (name !== undefined) {
      values.push(name.trim());
      fields.push(`name = $${values.length}`);
    }

    if (phone !== undefined) {
      values.push(phone ? phone.trim() : null);
      fields.push(`phone = $${values.length}`);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${values.length} AND role = 'CUSTOMER'
      RETURNING id;
    `;
    const res = await executor.query(sql, values);
    if (!res.rows[0]) return null;
    if (!dbClient) return this.findById(id);
    const updated = await executor.query(
      `SELECT id, name, email, phone, role, status, profile_picture_link, email_verified_at,
              authprovider, created_at, updated_at
       FROM users WHERE id = $1 AND role = 'CUSTOMER'`,
      [id]
    );
    return updated.rows[0] ? this.formatCustomerListItem(updated.rows[0]) : null;
  },

  /**
   * Update customer account status (ACTIVE, BLOCKED)
   * When BLOCKED, invalidates active refresh token immediately
   */
  async updateStatus(id, status, dbClient = null) {
    const executor = dbClient || { query };
    let sql;
    let values;

    if (status === "BLOCKED") {
      sql = `
        UPDATE users
        SET status = $1, refresh_token = NULL, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW()
        WHERE id = $2 AND role = 'CUSTOMER'
        RETURNING id, name, status, updated_at;
      `;
      values = [status, id];
    } else {
      sql = `
        UPDATE users
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND role = 'CUSTOMER'
        RETURNING id, name, status, updated_at;
      `;
      values = [status, id];
    }

    const res = await executor.query(sql, values);
    return res.rows[0] || null;
  },

  /**
   * Get customer order history
   */
  async getCustomerOrders(userId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(
      "SELECT COUNT(*) AS total FROM orders WHERE user_id = $1",
      [userId]
    );
    const totalItems = parseInt(countRes.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    const sql = `
      SELECT 
        id,
        order_number,
        total_amount::numeric(10, 2) AS total_amount,
        delivery_fee::numeric(10, 2) AS delivery_fee,
        order_status,
        created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const dataRes = await query(sql, [userId, limitNum, offset]);

    return {
      orders: dataRes.rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        totalAmount: parseFloat(o.total_amount),
        deliveryFee: parseFloat(o.delivery_fee),
        orderStatus: o.order_status,
        createdAt: o.created_at,
      })),
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    };
  },

  /**
   * Get saved wishlist products for customer
   */
  async getCustomerWishlist(userId, { page = 1, limit = 12 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM wishlist_items
       WHERE user_id = $1`,
      [userId]
    );
    const totalItems = parseInt(countRes.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.sale_price,
        p.status,
        p.stock_quantity,
        p.track_inventory,
        b.name AS brand_name,
        pi.image_url AS thumbnail_url,
        wi.created_at AS added_at
      FROM wishlist_items wi
      JOIN products p ON p.id = wi.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
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

    return {
      items: res.rows.map((row) => {
        const regularPrice = parseFloat(row.price || 0);
        const salePrice = row.sale_price ? parseFloat(row.sale_price) : null;
        const currentPrice = salePrice !== null && salePrice < regularPrice ? salePrice : regularPrice;
        const stockQuantity = Number(row.stock_quantity || 0);
        const inStock = row.status === "ACTIVE" && (row.track_inventory ? stockQuantity > 0 : true);

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          price: regularPrice,
          salePrice,
          currentPrice,
          status: row.status,
          stockQuantity,
          inStock,
          isOutOfStock: !inStock,
          brandName: row.brand_name || "Eloura",
          thumbnailUrl: row.thumbnail_url || null,
          addedAt: row.added_at,
        };
      }),
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    };
  },

  /**
   * Get customer activity log from interactions
   */
  async getCustomerActivity(userId, { limit = 50 } = {}) {
    const sql = `
      SELECT 
        i.id,
        i.interaction_type,
        i.created_at,
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        b.name AS brand_name,
        pi.image_url AS thumbnail_url
      FROM interactions i
      JOIN products p ON p.id = i.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2;
    `;
    const res = await query(sql, [userId, Math.min(100, Math.max(1, limit))]);
    return res.rows.map((r) => ({
      id: r.id,
      type: r.interaction_type,
      createdAt: r.created_at,
      product: {
        id: r.product_id,
        name: r.product_name,
        slug: r.product_slug,
        brandName: r.brand_name,
        thumbnailUrl: r.thumbnail_url,
      },
    }));
  },

  /**
   * Get customer saved delivery addresses
   */
  async getCustomerAddresses(userId) {
    const sql = `
      SELECT 
        id,
        label,
        recipient_name,
        phone,
        division,
        district,
        area,
        street_address,
        postal_code,
        is_default,
        created_at
      FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC;
    `;
    const res = await query(sql, [userId]);
    return res.rows.map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipient_name,
      phone: a.phone,
      division: a.division,
      district: a.district,
      area: a.area,
      streetAddress: a.street_address,
      postalCode: a.postal_code,
      isDefault: Boolean(a.is_default),
      createdAt: a.created_at,
    }));
  },

  /**
   * Fetch all matching customers for CSV Export (capped at 5000 max)
   */
  async exportCustomers({
    search = "",
    status = "all",
    hasOrders = "all",
    startDate = null,
    endDate = null,
  } = {}) {
    const conditions = ["u.role = 'CUSTOMER'"];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const idx = values.length;
      conditions.push(
        `(LOWER(u.name) LIKE $${idx} OR LOWER(COALESCE(u.email, '')) LIKE $${idx} OR LOWER(COALESCE(u.phone, '')) LIKE $${idx})`
      );
    }

    if (status && status !== "all") {
      values.push(status.toUpperCase());
      conditions.push(`u.status = $${values.length}`);
    }

    if (startDate) {
      values.push(new Date(startDate));
      conditions.push(`u.created_at >= $${values.length}`);
    }
    if (endDate) {
      values.push(new Date(endDate));
      conditions.push(`u.created_at <= $${values.length}`);
    }

    if (hasOrders === "yes") {
      conditions.push(
        `EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED'))`
      );
    } else if (hasOrders === "no") {
      conditions.push(
        `NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.order_status NOT IN ('CANCELLED', 'RETURNED'))`
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        u.email_verified_at,
        u.created_at,
        COALESCE(ord.order_count, 0)::int AS order_count,
        COALESCE(ord.total_spent, 0.00)::numeric(10, 2) AS total_spent
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE order_status NOT IN ('CANCELLED', 'RETURNED')) AS order_count,
          SUM(total_amount) FILTER (WHERE order_status = 'DELIVERED') AS total_spent
        FROM orders
        GROUP BY user_id
      ) ord ON ord.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT 5000;
    `;

    const res = await query(sql, values);
    return res.rows.map((r) => this.formatCustomerListItem(r));
  },

  /**
   * Format customer list item
   */
  formatCustomerListItem(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email || null,
      phone: row.phone || null,
      role: row.role,
      status: row.status || "ACTIVE",
      profilePicture: row.profile_picture_link || null,
      emailVerified: Boolean(row.email_verified_at),
      emailVerifiedAt: row.email_verified_at || null,
      authProvider: row.authprovider || "local",
      orderCount: parseInt(row.order_count || 0, 10),
      totalSpent: parseFloat(row.total_spent || 0),
      lastOrderDate: row.last_order_date || null,
      wishlistCount: row.wishlist_count !== undefined ? parseInt(row.wishlist_count, 10) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

module.exports = customerRepository;


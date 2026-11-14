const { pool, query } = require("../config/db");

const allowedSorts = {
  date: "o.created_at",
  total: "COALESCE(o.grand_total, o.total_amount)",
};

function normalizeStatus(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "placed") return "pending";
  return raw;
}

function mapList(row) {
  const canonicalStatus = normalizeStatus(row.status || row.order_status);
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.shipping_name || row.customer_name || "Guest customer",
    customerPhone: row.shipping_phone || row.customer_phone || null,
    customerEmail: row.customer_email || null,
    createdAt: row.created_at,
    placedAt: row.placed_at || row.created_at,
    itemCount: Number(row.item_count || 0),
    totalAmount: Number(row.grand_total || row.total_amount || 0),
    grandTotal: Number(row.grand_total || row.total_amount || 0),
    status: canonicalStatus,
    orderStatus: canonicalStatus.toUpperCase(),
    paymentStatus: row.payment_status || "unpaid",
    paymentMethod: row.payment_method || "none",
    deliveryArea: row.shipping_area || row.delivery_area || null,
    courierName: row.courier_name || null,
    trackingNumber: row.tracking_number || null,
    hasPendingCosts: Boolean(row.has_pending_costs),
    pendingCostCount: Number(row.pending_cost_count || 0),
  };
}

const adminOrderRepository = {
  async list({ search = "", status = "all", costStatus = "all", startDate = "", endDate = "", district = "", sortBy = "date", sortOrder = "desc", page = 1, limit = 20 } = {}) {
    const values = [];
    const conditions = [];
    const add = (value) => { values.push(value); return `$${values.length}`; };

    if (search.trim()) {
      const term = add(`%${search.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(o.order_number) LIKE ${term} OR LOWER(COALESCE(u.name, '')) LIKE ${term} OR LOWER(COALESCE(u.phone, '')) LIKE ${term} OR LOWER(COALESCE(u.email, '')) LIKE ${term} OR LOWER(COALESCE(o.shipping_name, '')) LIKE ${term} OR LOWER(COALESCE(o.shipping_phone, '')) LIKE ${term} OR LOWER(COALESCE(o.tracking_number, '')) LIKE ${term})`
      );
    }

    if (status && status !== "all") {
      const target = normalizeStatus(status);
      if (target === "pending") {
        conditions.push(`(LOWER(o.status) IN ('pending', 'placed') OR LOWER(o.order_status) IN ('pending', 'placed'))`);
      } else {
        const statusParam = add(target);
        conditions.push(`(LOWER(o.status) = ${statusParam} OR LOWER(o.order_status) = ${statusParam})`);
      }
    }

    if (costStatus === "pending") {
      conditions.push(`EXISTS (SELECT 1 FROM order_items oi_cs WHERE oi_cs.order_id = o.id AND oi_cs.cost_price IS NULL)`);
    } else if (costStatus === "entered" || costStatus === "completed") {
      conditions.push(`NOT EXISTS (SELECT 1 FROM order_items oi_cs WHERE oi_cs.order_id = o.id AND oi_cs.cost_price IS NULL)`);
    }

    if (startDate) conditions.push(`o.created_at >= ${add(new Date(`${startDate}T00:00:00`))}`);
    if (endDate) conditions.push(`o.created_at < ${add(new Date(new Date(`${endDate}T00:00:00`).getTime() + 86400000))}`);
    if (district.trim()) {
      const distParam = add(district.trim().toLowerCase());
      conditions.push(`(LOWER(COALESCE(o.shipping_city, '')) = ${distParam} OR LOWER(COALESCE(a.district, '')) = ${distParam})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sort = allowedSorts[sortBy] || allowedSorts.date;
    const direction = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const offset = (pageNumber - 1) * pageLimit;

    const countQuery = `
      SELECT COUNT(*)::int AS total 
      FROM orders o 
      LEFT JOIN users u ON u.id = o.user_id 
      LEFT JOIN LATERAL (SELECT district FROM addresses WHERE user_id = o.user_id ORDER BY is_default DESC, created_at DESC LIMIT 1) a ON true 
      ${where}
    `;
    const count = await query(countQuery, values);
    const total = count.rows[0]?.total || 0;

    const dataValues = [...values, pageLimit, offset];
    const dataQuery = `
      SELECT o.id, o.order_number, o.created_at, o.placed_at,
             COALESCE(o.grand_total, o.total_amount) AS grand_total,
             o.total_amount, o.status, o.order_status, o.payment_status, o.payment_method,
             o.shipping_name, o.shipping_phone, o.shipping_area, o.courier_name, o.tracking_number,
             u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
             a.area AS delivery_area, COUNT(oi.id)::int AS item_count,
             CASE WHEN COUNT(oi.id) = 0 THEN false ELSE COALESCE(BOOL_OR(oi.cost_price IS NULL), false) END AS has_pending_costs,
             COUNT(oi.id) FILTER (WHERE oi.id IS NOT NULL AND oi.cost_price IS NULL)::int AS pending_cost_count
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN LATERAL (SELECT area, district FROM addresses WHERE user_id = o.user_id ORDER BY is_default DESC, created_at DESC LIMIT 1) a ON true
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${where}
      GROUP BY o.id, u.name, u.phone, u.email, a.area
      ORDER BY ${sort} ${direction}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}
    `;
    const result = await query(dataQuery, dataValues);

    return {
      orders: result.rows.map(mapList),
      pagination: {
        total: Number(total),
        totalItems: Number(total),
        page: pageNumber,
        limit: pageLimit,
        totalPages: Math.max(1, Math.ceil(Number(total) / pageLimit)),
        hasNextPage: pageNumber < Math.max(1, Math.ceil(Number(total) / pageLimit)),
        hasPrevPage: pageNumber > 1,
      },
    };
  },

  async summary() {
    const result = await query(`
      SELECT 
        COUNT(*)::int AS all_orders,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('placed','pending') OR LOWER(order_status) IN ('placed','pending'))::int AS pending,
        COUNT(*) FILTER (WHERE LOWER(status) = 'confirmed' OR LOWER(order_status) = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE LOWER(status) = 'processing' OR LOWER(order_status) = 'processing')::int AS processing,
        COUNT(*) FILTER (WHERE LOWER(status) = 'shipped' OR LOWER(order_status) = 'shipped')::int AS shipped,
        COUNT(*) FILTER (WHERE LOWER(status) = 'delivered' OR LOWER(order_status) = 'delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE LOWER(status) = 'cancelled' OR LOWER(order_status) = 'cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE LOWER(status) = 'returned' OR LOWER(order_status) = 'returned')::int AS returned,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM order_items oi_c WHERE oi_c.order_id = orders.id AND oi_c.cost_price IS NULL))::int AS cost_pending
      FROM orders
    `);
    return result.rows[0];
  },

  async getById(id) {
    const result = await query(
      `SELECT o.id, o.order_number, o.created_at, o.placed_at, o.updated_at, o.delivered_at,
              COALESCE(o.grand_total, o.total_amount) AS grand_total,
              COALESCE(o.shipping_fee, o.delivery_fee) AS shipping_fee,
              COALESCE(o.subtotal, o.product_subtotal) AS subtotal,
              COALESCE(o.discount_total, o.coupon_discount, 0) AS discount_total,
              o.total_amount, o.delivery_fee, o.product_subtotal, o.product_discount,
              o.coupon_code, o.coupon_discount, o.delivery_discount, o.currency,
              o.status, o.order_status, o.payment_status, o.payment_method,
              o.customer_note, o.admin_note, o.courier_name, o.tracking_number,
              o.shipping_name, o.shipping_phone, o.shipping_address, o.shipping_city, o.shipping_area,
              u.id AS customer_id, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              a.recipient_name, a.phone AS address_phone, a.division, a.district, a.area, a.street_address, a.postal_code
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN LATERAL (SELECT * FROM addresses WHERE user_id = o.user_id ORDER BY is_default DESC, created_at DESC LIMIT 1) a ON true
       WHERE o.id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    const canonicalStatus = normalizeStatus(row.status || row.order_status);

    const items = await query(
      `SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.sku, oi.quantity, oi.unit_price,
              oi.product_discount, oi.line_total, oi.cost_price, oi.cost_entered_at,
              u_c.name AS cost_entered_by_name,
              COALESCE(pv.image_url, pi.image_url) AS image_url
       FROM order_items oi
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       LEFT JOIN users u_c ON u_c.id = oi.cost_entered_by
       LEFT JOIN LATERAL (
         SELECT image_url FROM product_images
         WHERE product_id = oi.product_id
         ORDER BY is_primary DESC, display_order ASC LIMIT 1
       ) pi ON true
       WHERE oi.order_id = $1 ORDER BY oi.id`,
      [id]
    );

    const otherCosts = await query(
      `SELECT ooc.id, ooc.order_id, ooc.header, ooc.amount, ooc.note, ooc.created_at, ooc.updated_at,
              u.name AS created_by_name, u.role AS created_by_role
       FROM order_other_costs ooc
       LEFT JOIN users u ON u.id = ooc.created_by
       WHERE ooc.order_id = $1
       ORDER BY ooc.created_at ASC, ooc.id ASC`,
      [id]
    );

    const statusHistory = await query(
      `SELECT osh.id, osh.from_status, osh.to_status, osh.note, osh.created_at,
              u.name AS actor_name, u.role AS actor_role
       FROM order_status_history osh
       LEFT JOIN users u ON u.id = osh.changed_by
       WHERE osh.order_id = $1
       ORDER BY osh.created_at ASC, osh.id ASC`,
      [id]
    );

    const auditHistory = await query(
      `SELECT id, action, actor_type, actor_id, previous_values, new_values, metadata, created_at
       FROM audit_logs
       WHERE entity_type = 'ORDER' AND entity_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id]
    );

    let totalItemCost = 0;
    let itemsWithCostCount = 0;
    let pendingCostCount = 0;
    let itemGrossProfit = 0;

    const mappedItems = items.rows.map((item) => {
      const cost = item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : null;
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const itemProfit = cost !== null ? Number(((unitPrice - cost) * qty).toFixed(2)) : null;

      if (cost !== null) {
        totalItemCost += cost * qty;
        itemsWithCostCount += 1;
        itemGrossProfit += itemProfit;
      } else {
        pendingCostCount += 1;
      }

      return {
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        productName: item.product_name,
        sku: item.sku,
        quantity: qty,
        unitPrice,
        productDiscount: Number(item.product_discount || 0),
        lineTotal: Number(item.line_total),
        costPrice: cost,
        costEnteredAt: item.cost_entered_at || null,
        costEnteredByName: item.cost_entered_by_name || null,
        profit: itemProfit,
        imageUrl: item.image_url || null,
      };
    });

    const mappedOtherCosts = otherCosts.rows.map((c) => ({
      id: c.id,
      orderId: c.order_id,
      header: c.header,
      amount: Number(c.amount),
      note: c.note || null,
      createdByName: c.created_by_name || "Admin",
      createdByRole: c.created_by_role || "ADMIN",
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const totalOtherCost = mappedOtherCosts.reduce((sum, c) => sum + c.amount, 0);
    const sellingTotal = Number(row.grand_total || row.total_amount || 0);
    const netProfit = itemsWithCostCount > 0 ? Number((itemGrossProfit - totalOtherCost).toFixed(2)) : null;
    const netMarginPercentage = (sellingTotal > 0 && netProfit !== null)
      ? Number(((netProfit / sellingTotal) * 100).toFixed(2))
      : null;

    const profitSummary = {
      hasPendingCosts: pendingCostCount > 0,
      pendingCostCount,
      itemsWithCostCount,
      totalItemsCount: mappedItems.length,
      totalSellingAmount: sellingTotal,
      totalItemCost: Number(totalItemCost.toFixed(2)),
      totalOtherCost: Number(totalOtherCost.toFixed(2)),
      itemGrossProfit: Number(itemGrossProfit.toFixed(2)),
      netProfit,
      netMarginPercentage,
    };

    return {
      id: row.id,
      orderNumber: row.order_number,
      createdAt: row.created_at,
      placedAt: row.placed_at || row.created_at,
      updatedAt: row.updated_at,
      deliveredAt: row.delivered_at,
      totalAmount: Number(row.grand_total || row.total_amount),
      grandTotal: Number(row.grand_total || row.total_amount),
      deliveryFee: Number(row.shipping_fee || row.delivery_fee || 0),
      shippingFee: Number(row.shipping_fee || row.delivery_fee || 0),
      productSubtotal: Number(row.subtotal || row.product_subtotal || 0),
      subtotal: Number(row.subtotal || row.product_subtotal || 0),
      productDiscount: Number(row.product_discount || 0),
      discountTotal: Number(row.discount_total || row.coupon_discount || 0),
      couponCode: row.coupon_code,
      couponDiscount: Number(row.coupon_discount || 0),
      deliveryDiscount: Number(row.delivery_discount || 0),
      currency: row.currency || "BDT",
      status: canonicalStatus,
      orderStatus: canonicalStatus.toUpperCase(),
      paymentStatus: row.payment_status || "unpaid",
      paymentMethod: row.payment_method || "none",
      customerNote: row.customer_note || null,
      adminNote: row.admin_note || null,
      courierName: row.courier_name || null,
      trackingNumber: row.tracking_number || null,
      customer: row.customer_id ? {
        id: row.customer_id,
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email,
      } : null,
      shipping: {
        recipientName: row.shipping_name || row.recipient_name,
        phone: row.shipping_phone || row.address_phone,
        division: row.division,
        district: row.shipping_city || row.district,
        area: row.shipping_area || row.area,
        streetAddress: row.shipping_address || row.street_address,
        postalCode: row.postal_code,
      },
      address: (row.shipping_name || row.recipient_name) ? {
        recipientName: row.shipping_name || row.recipient_name,
        phone: row.shipping_phone || row.address_phone,
        division: row.division,
        district: row.shipping_city || row.district,
        area: row.shipping_area || row.area,
        streetAddress: row.shipping_address || row.street_address,
        postalCode: row.postal_code,
      } : null,
      items: mappedItems,
      otherCosts: mappedOtherCosts,
      profitSummary,
      statusHistory: statusHistory.rows.map((h) => ({
        id: h.id,
        fromStatus: h.from_status ? normalizeStatus(h.from_status) : null,
        toStatus: normalizeStatus(h.to_status),
        note: h.note,
        actorName: h.actor_name || (h.actor_role === "ADMIN" ? "Administrator" : "Customer"),
        actorRole: h.actor_role,
        createdAt: h.created_at,
      })),
      history: auditHistory.rows.map((entry) => ({
        id: entry.id,
        eventType: entry.action,
        actorRole: entry.actor_type,
        actorId: entry.actor_id,
        previousValues: entry.previous_values || {},
        newValues: entry.new_values || {},
        changedFields: Object.fromEntries(
          Object.keys({ ...(entry.previous_values || {}), ...(entry.new_values || {}) }).map((key) => [
            key,
            { old: entry.previous_values?.[key] ?? null, new: entry.new_values?.[key] ?? null },
          ])
        ),
        metadata: entry.metadata || {},
        createdAt: entry.created_at,
      })),
    };
  },

  async updateItemCosts(orderId, itemCosts = [], actorId = null) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updated = [];
      for (const item of itemCosts) {
        const cost = (item.costPrice === "" || item.costPrice === null || item.costPrice === undefined)
          ? null
          : Math.max(0, Number(item.costPrice));
        const res = await client.query(
          `UPDATE order_items
           SET cost_price = $1,
               cost_entered_by = $2,
               cost_entered_at = CASE WHEN $1::numeric IS NULL THEN NULL ELSE NOW() END
           WHERE id = $3 AND order_id = $4
           RETURNING id, product_name, sku, quantity, unit_price, cost_price, cost_entered_at`,
          [cost, cost !== null ? actorId : null, item.id, orderId]
        );
        if (res.rows[0]) updated.push(res.rows[0]);
      }
      await client.query("COMMIT");
      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async addOtherCost(orderId, { header, amount, note } = {}, actorId = null) {
    const cleanHeader = String(header || "").trim().slice(0, 100);
    const cleanAmount = Math.max(0.01, Number(amount) || 0);
    const cleanNote = note ? String(note).trim() : null;

    if (cleanHeader) {
      await query(
        `INSERT INTO cost_headers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [cleanHeader]
      );
    }

    const result = await query(
      `INSERT INTO order_other_costs (order_id, header, amount, note, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, order_id, header, amount, note, created_by, created_at, updated_at`,
      [orderId, cleanHeader, cleanAmount, cleanNote, actorId]
    );
    return result.rows[0];
  },

  async updateOtherCost(costId, orderId, { header, amount, note } = {}, actorId = null) {
    const cleanHeader = header !== undefined ? String(header).trim().slice(0, 100) : undefined;
    const cleanAmount = amount !== undefined ? Math.max(0.01, Number(amount) || 0) : undefined;
    const cleanNote = note !== undefined ? (note ? String(note).trim() : null) : undefined;

    if (cleanHeader) {
      await query(
        `INSERT INTO cost_headers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [cleanHeader]
      );
    }

    const result = await query(
      `UPDATE order_other_costs
       SET header = COALESCE($1, header),
           amount = COALESCE($2, amount),
           note = CASE WHEN $3::boolean THEN $4 ELSE note END,
           updated_at = NOW()
       WHERE id = $5 AND order_id = $6
       RETURNING id, order_id, header, amount, note, created_by, created_at, updated_at`,
      [cleanHeader ?? null, cleanAmount ?? null, cleanNote !== undefined, cleanNote ?? null, costId, orderId]
    );
    return result.rows[0] || null;
  },

  async deleteOtherCost(costId, orderId) {
    const result = await query(
      `DELETE FROM order_other_costs WHERE id = $1 AND order_id = $2 RETURNING *`,
      [costId, orderId]
    );
    return result.rows[0] || null;
  },

  async getCostHeaders() {
    const result = await query(
      `SELECT DISTINCT name FROM (
         SELECT name FROM cost_headers WHERE is_active = true
         UNION
         SELECT header AS name FROM order_other_costs
       ) h ORDER BY name ASC`
    );
    return result.rows.map((r) => r.name);
  },
};

module.exports = adminOrderRepository;

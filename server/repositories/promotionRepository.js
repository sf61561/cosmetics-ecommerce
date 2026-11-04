const { query } = require("../config/db");

function mapDeliveryRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    deliveryCharge: Number(row.delivery_charge),
    minOrderAmount: Number(row.min_order_amount || 0),
    freeDeliveryThreshold:
      row.free_delivery_threshold === null ? null : Number(row.free_delivery_threshold),
    estimatedDeliveryTime: row.estimated_delivery_time,
    priority: row.priority || 0,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCoupon(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    maxDiscountAmount:
      row.max_discount_amount === null ? null : Number(row.max_discount_amount),
    minOrderAmount: Number(row.min_order_amount),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    usageLimit: row.usage_limit,
    perCustomerLimit: row.per_customer_limit,
    usageCount: row.usage_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const promotionRepository = {
  async listDeliveryRules() {
    const result = await query(
      `SELECT * FROM delivery_rules ORDER BY CASE WHEN zone = 'INSIDE_DHAKA' THEN 1 ELSE 2 END ASC`
    );
    return result.rows.map(mapDeliveryRule);
  },

  async getDeliveryRule(id) {
    const result = await query("SELECT * FROM delivery_rules WHERE id = $1", [id]);
    return mapDeliveryRule(result.rows[0]);
  },

  async getDeliveryByZone(zone) {
    const result = await query("SELECT * FROM delivery_rules WHERE zone = $1", [zone]);
    return mapDeliveryRule(result.rows[0]);
  },

  async saveDeliveryRule(data, id = null, dbClient = null) {
    const executor = dbClient || { query };
    const targetZone = data.zone;
    const name = targetZone === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka";
    const charge = Number(data.deliveryCharge ?? 0);
    const time = data.estimatedDeliveryTime || (targetZone === "INSIDE_DHAKA" ? "2-3 business days" : "3-5 business days");
    const active = data.isActive !== false;

    if (id) {
      const result = await executor.query(
        `UPDATE delivery_rules
         SET name = $1, zone = $2, delivery_charge = $3, estimated_delivery_time = $4, is_active = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [name, targetZone, charge, time, active, id]
      );
      return mapDeliveryRule(result.rows[0]);
    }

    const result = await executor.query(
      `INSERT INTO delivery_rules (name, zone, delivery_charge, min_order_amount, estimated_delivery_time, priority, is_active)
       VALUES ($1, $2, $3, 0, $4, 0, $5)
       ON CONFLICT (zone) DO UPDATE
       SET name = EXCLUDED.name,
           delivery_charge = EXCLUDED.delivery_charge,
           estimated_delivery_time = EXCLUDED.estimated_delivery_time,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
       RETURNING *`,
      [name, targetZone, charge, time, active]
    );
    return mapDeliveryRule(result.rows[0]);
  },

  async updateDeliverySettings({ insideDhaka, outsideDhaka }, dbClient = null) {
    const executor = dbClient || { query };
    const updated = [];
    if (insideDhaka && insideDhaka.deliveryCharge !== undefined) {
      const res = await executor.query(
        `UPDATE delivery_rules
         SET delivery_charge = $1,
             estimated_delivery_time = COALESCE($2, estimated_delivery_time),
             is_active = COALESCE($3, is_active),
             name = 'Inside Dhaka',
             updated_at = NOW()
         WHERE zone = 'INSIDE_DHAKA'
         RETURNING *`,
        [
          Number(insideDhaka.deliveryCharge),
          insideDhaka.estimatedDeliveryTime || null,
          insideDhaka.isActive !== undefined ? Boolean(insideDhaka.isActive) : true,
        ]
      );
      if (res.rows[0]) updated.push(mapDeliveryRule(res.rows[0]));
    }
    if (outsideDhaka && outsideDhaka.deliveryCharge !== undefined) {
      const res = await executor.query(
        `UPDATE delivery_rules
         SET delivery_charge = $1,
             estimated_delivery_time = COALESCE($2, estimated_delivery_time),
             is_active = COALESCE($3, is_active),
             name = 'Outside Dhaka',
             updated_at = NOW()
         WHERE zone = 'OUTSIDE_DHAKA'
         RETURNING *`,
        [
          Number(outsideDhaka.deliveryCharge),
          outsideDhaka.estimatedDeliveryTime || null,
          outsideDhaka.isActive !== undefined ? Boolean(outsideDhaka.isActive) : true,
        ]
      );
      if (res.rows[0]) updated.push(mapDeliveryRule(res.rows[0]));
    }
    return updated;
  },

  async listCoupons({ search = "", status = "all", discountType = "all", page = 1, limit = 10 } = {}) {
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const values = [];
    const conditions = [];
    if (search.trim()) {
      values.push(`%${search.trim().toUpperCase()}%`);
      conditions.push(`code LIKE $${values.length}`);
    }
    if (status === "active" || status === "inactive") {
      values.push(status === "active");
      conditions.push(`is_active = $${values.length}`);
    }
    if (discountType !== "all") {
      values.push(discountType.toUpperCase());
      conditions.push(`discount_type = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM coupons ${where}`, values);
    const dataValues = [...values, limitNumber, (pageNumber - 1) * limitNumber];
    const result = await query(
      `SELECT * FROM coupons ${where} ORDER BY created_at DESC
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
      dataValues
    );
    const total = countResult.rows[0].total;
    return {
      coupons: result.rows.map(mapCoupon),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / limitNumber)),
      },
    };
  },

  async getCoupon(id) {
    const result = await query("SELECT * FROM coupons WHERE id = $1", [id]);
    return mapCoupon(result.rows[0]);
  },

  async saveCoupon(data, id = null, dbClient = null) {
    const executor = dbClient || { query };
    const values = [
      data.code,
      data.description || null,
      data.discountType,
      data.discountValue,
      data.maxDiscountAmount,
      data.minOrderAmount,
      data.startsAt || null,
      data.expiresAt || null,
      data.usageLimit,
      data.perCustomerLimit,
      data.isActive,
    ];
    if (id) {
      values.push(id);
      const result = await executor.query(
        `UPDATE coupons SET code=$1, description=$2, discount_type=$3, discount_value=$4,
         max_discount_amount=$5, min_order_amount=$6, starts_at=$7, expires_at=$8,
         usage_limit=$9, per_customer_limit=$10, is_active=$11, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        values
      );
      return mapCoupon(result.rows[0]);
    }
    const result = await executor.query(
      `INSERT INTO coupons
       (code, description, discount_type, discount_value, max_discount_amount,
        min_order_amount, starts_at, expires_at, usage_limit, per_customer_limit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      values
    );
    return mapCoupon(result.rows[0]);
  },

  async updateCouponStatus(id, isActive, dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query(
      "UPDATE coupons SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [isActive, id]
    );
    return mapCoupon(result.rows[0]);
  },

  async findUsableCoupon(code, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      "SELECT * FROM coupons WHERE code = $1 FOR UPDATE",
      [code]
    );
    return result.rows[0] || null;
  },

  async countCustomerRedemptions(couponId, userId, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      "SELECT COUNT(*)::int AS count FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2",
      [couponId, userId]
    );
    return result.rows[0].count;
  },
};

module.exports = promotionRepository;

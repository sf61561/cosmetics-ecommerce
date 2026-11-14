const { pool, query } = require("../config/db");

const adminReturnRepository = {
  async list({
    search = "",
    status = "all",
    reason = "all",
    startDate = "",
    endDate = "",
    sortBy = "date",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = {}) {
    const values = [];
    const conditions = [];
    const add = (val) => { values.push(val); return `$${values.length}`; };

    if (search.trim()) {
      const term = add(`%${search.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(sr.return_number) LIKE ${term} OR LOWER(o.order_number) LIKE ${term} OR LOWER(COALESCE(u.name, '')) LIKE ${term} OR LOWER(COALESCE(u.email, '')) LIKE ${term} OR LOWER(COALESCE(u.phone, '')) LIKE ${term})`
      );
    }

    if (status && status !== "all") {
      conditions.push(`sr.status = ${add(status.toUpperCase())}`);
    }

    if (reason && reason !== "all") {
      conditions.push(`sr.reason = ${add(reason.toUpperCase())}`);
    }

    if (startDate) conditions.push(`sr.created_at >= ${add(new Date(`${startDate}T00:00:00`))}`);
    if (endDate) conditions.push(`sr.created_at < ${add(new Date(new Date(`${endDate}T00:00:00`).getTime() + 86400000))}`);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const direction = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
    const sortField = sortBy === "amount" ? "sr.refund_amount" : "sr.created_at";

    const pageNum = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * pageLimit;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM sales_returns sr
      JOIN orders o ON o.id = sr.order_id
      LEFT JOIN users u ON u.id = sr.customer_id
      ${where}
    `;
    const countRes = await query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    const dataValues = [...values, pageLimit, offset];
    const dataQuery = `
      SELECT sr.id, sr.return_number, sr.order_id, sr.status, sr.reason,
             sr.refund_amount, sr.refund_method, sr.resolution_type,
             sr.requested_at, sr.completed_at, sr.created_at,
             o.order_number,
             u.id AS customer_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
             COUNT(sri.id)::int AS item_count
      FROM sales_returns sr
      JOIN orders o ON o.id = sr.order_id
      LEFT JOIN users u ON u.id = sr.customer_id
      LEFT JOIN sales_return_items sri ON sri.return_id = sr.id
      ${where}
      GROUP BY sr.id, o.order_number, u.id, u.name, u.email, u.phone
      ORDER BY ${sortField} ${direction}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}
    `;
    const result = await query(dataQuery, dataValues);

    return {
      returns: result.rows.map((r) => ({
        id: r.id,
        returnNumber: r.return_number,
        orderId: r.order_id,
        orderNumber: r.order_number,
        status: r.status,
        reason: r.reason,
        refundAmount: Number(r.refund_amount),
        refundMethod: r.refund_method,
        resolutionType: r.resolution_type,
        itemCount: Number(r.item_count || 0),
        customer: {
          id: r.customer_id,
          name: r.customer_name || "Customer",
          email: r.customer_email,
          phone: r.customer_phone,
        },
        requestedAt: r.requested_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.max(1, Math.ceil(total / pageLimit)),
      },
    };
  },

  async summary() {
    const res = await query(`
      SELECT
        COUNT(*)::int AS all_returns,
        COUNT(*) FILTER (WHERE status = 'REQUESTED')::int AS requested,
        COUNT(*) FILTER (WHERE status = 'INFO_NEEDED')::int AS info_needed,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
        COUNT(*) FILTER (WHERE status IN ('PICKUP_SCHEDULED', 'IN_TRANSIT'))::int AS in_transit,
        COUNT(*) FILTER (WHERE status = 'RECEIVED')::int AS received,
        COUNT(*) FILTER (WHERE status = 'INSPECTED')::int AS inspected,
        COUNT(*) FILTER (WHERE status = 'REFUNDED')::int AS refunded,
        COUNT(*) FILTER (WHERE status = 'EXCHANGED')::int AS exchanged,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
      FROM sales_returns
    `);
    return res.rows[0];
  },

  async getById(id) {
    const returnRes = await query(
      `SELECT sr.id, sr.return_number, sr.order_id, sr.customer_id, sr.status, sr.reason,
              sr.customer_note, sr.admin_note, sr.rejection_reason, sr.info_needed_prompt,
              sr.resolution_type, sr.refund_amount, sr.refund_method, sr.refund_account_details,
              sr.return_shipping_fee, sr.return_shipping_payer, sr.is_window_overridden,
              sr.requested_at, sr.approved_at, sr.received_at, sr.completed_at, sr.created_at,
              o.order_number, o.created_at AS order_created_at, o.delivered_at AS order_delivered_at,
              COALESCE(o.grand_total, o.total_amount) AS order_total,
              u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM sales_returns sr
       JOIN orders o ON o.id = sr.order_id
       LEFT JOIN users u ON u.id = sr.customer_id
       WHERE sr.id = $1`,
      [id]
    );

    if (!returnRes.rows[0]) return null;
    const row = returnRes.rows[0];

    // Fetch items with unit cost and conditions
    const itemsRes = await query(
      `SELECT sri.id, sri.order_item_id, sri.product_id, sri.variant_id,
              sri.quantity, sri.unit_selling_price, sri.unit_cost_price,
              sri.item_condition, sri.cost_recovered_amount, sri.restocked,
              oi.product_name, oi.sku,
              COALESCE(pv.image_url, pi.image_url) AS image_url
       FROM sales_return_items sri
       JOIN order_items oi ON oi.id = sri.order_item_id
       LEFT JOIN product_variants pv ON pv.id = sri.variant_id
       LEFT JOIN LATERAL (
         SELECT image_url FROM product_images
         WHERE product_id = sri.product_id
         ORDER BY is_primary DESC, display_order ASC LIMIT 1
       ) pi ON true
       WHERE sri.return_id = $1
       ORDER BY sri.id ASC`,
      [id]
    );

    // Fetch images grouped into customer evidence vs admin inspection
    const imagesRes = await query(
      `SELECT id, return_item_id, uploader_type, image_url, public_id, file_size, mime_type, file_hash, created_at
       FROM sales_return_images
       WHERE return_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    // Fetch timeline
    const historyRes = await query(
      `SELECT h.id, h.from_status, h.to_status, h.changed_by, h.actor_role, h.note, h.created_at,
              u.name AS actor_name
       FROM sales_return_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.return_id = $1
       ORDER BY h.created_at ASC`,
      [id]
    );

    return {
      id: row.id,
      returnNumber: row.return_number,
      return_number: row.return_number,
      orderId: row.order_id,
      order_id: row.order_id,
      orderNumber: row.order_number,
      order_number: row.order_number,
      orderTotal: Number(row.order_total),
      orderDeliveredAt: row.order_delivered_at,
      customerId: row.customer_id,
      customer_id: row.customer_id,
      customer: {
        id: row.customer_id,
        name: row.customer_name || "Customer",
        email: row.customer_email,
        phone: row.customer_phone,
      },
      status: row.status,
      reason: row.reason,
      customerNote: row.customer_note,
      customer_note: row.customer_note,
      adminNote: row.admin_note,
      admin_note: row.admin_note,
      rejectionReason: row.rejection_reason,
      rejection_reason: row.rejection_reason,
      infoNeededPrompt: row.info_needed_prompt,
      info_needed_prompt: row.info_needed_prompt,
      resolutionType: row.resolution_type,
      resolution_type: row.resolution_type,
      refundAmount: Number(row.refund_amount),
      refund_amount: Number(row.refund_amount),
      refundMethod: row.refund_method,
      refund_method: row.refund_method,
      refundAccountDetails: row.refund_account_details || {},
      refund_account_details: row.refund_account_details || {},
      returnShippingFee: Number(row.return_shipping_fee || 0),
      return_shipping_fee: Number(row.return_shipping_fee || 0),
      returnShippingPayer: row.return_shipping_payer,
      return_shipping_payer: row.return_shipping_payer,
      isWindowOverridden: row.is_window_overridden,
      is_window_overridden: row.is_window_overridden,
      requestedAt: row.requested_at,
      requested_at: row.requested_at,
      approvedAt: row.approved_at,
      approved_at: row.approved_at,
      receivedAt: row.received_at,
      received_at: row.received_at,
      completedAt: row.completed_at,
      completed_at: row.completed_at,
      createdAt: row.created_at,
      created_at: row.created_at,
      items: itemsRes.rows.map((it) => ({
        id: it.id,
        orderItemId: it.order_item_id,
        order_item_id: it.order_item_id,
        productId: it.product_id,
        product_id: it.product_id,
        productName: it.product_name,
        product_name: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unitSellingPrice: Number(it.unit_selling_price),
        unit_selling_price: Number(it.unit_selling_price),
        unitCostPrice: it.unit_cost_price !== null ? Number(it.unit_cost_price) : null,
        unit_cost_price: it.unit_cost_price !== null ? Number(it.unit_cost_price) : null,
        lineTotal: Number(it.unit_selling_price) * Number(it.quantity),
        itemCondition: it.item_condition || null,
        item_condition: it.item_condition || null,
        costRecoveredAmount: Number(it.cost_recovered_amount || 0),
        cost_recovered_amount: Number(it.cost_recovered_amount || 0),
        restocked: Boolean(it.restocked),
        imageUrl: it.image_url || null,
        product_image: it.image_url || null,
      })),
      images: imagesRes.rows.map((img) => ({
        id: img.id,
        returnItemId: img.return_item_id,
        return_item_id: img.return_item_id,
        uploaderType: img.uploader_type,
        uploader_type: img.uploader_type,
        imageUrl: img.image_url,
        image_url: img.image_url,
        publicId: img.public_id,
        public_id: img.public_id,
        createdAt: img.created_at,
        created_at: img.created_at,
      })),
      timeline: historyRes.rows.map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        old_status: h.from_status,
        toStatus: h.to_status,
        new_status: h.to_status,
        note: h.note,
        createdAt: h.created_at,
        created_at: h.created_at,
        actorName: h.actor_name,
        user_name: h.actor_name,
      })),
      history: historyRes.rows.map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        old_status: h.from_status,
        toStatus: h.to_status,
        new_status: h.to_status,
        note: h.note,
        createdAt: h.created_at,
        created_at: h.created_at,
        actorName: h.actor_name,
        user_name: h.actor_name,
      })),
    };
  },

  async updateStatus(id, newStatus, { note = "", rejectionReason = "", infoNeededPrompt = "", adminNote = "" } = {}, actorId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const currRes = await client.query(
        `SELECT id, status FROM sales_returns WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!currRes.rows[0]) throw new Error("Return request not found.");
      const current = currRes.rows[0];

      const updates = ["status = $1", "updated_at = NOW()"];
      const params = [newStatus];

      if (newStatus === "APPROVED") {
        updates.push("approved_at = NOW()");
      } else if (newStatus === "RECEIVED") {
        updates.push("received_at = NOW()");
      } else if (newStatus === "COMPLETED") {
        updates.push("completed_at = NOW()");
      }

      if (rejectionReason) {
        params.push(rejectionReason.trim());
        updates.push(`rejection_reason = $${params.length}`);
      }

      if (infoNeededPrompt) {
        params.push(infoNeededPrompt.trim());
        updates.push(`info_needed_prompt = $${params.length}`);
      }

      if (adminNote) {
        params.push(adminNote.trim());
        updates.push(`admin_note = $${params.length}`);
      }

      params.push(id);
      await client.query(
        `UPDATE sales_returns SET ${updates.join(", ")} WHERE id = $${params.length}`,
        params
      );

      await client.query(
        `INSERT INTO sales_return_status_history (
          return_id, from_status, to_status, changed_by, actor_role, note, created_at
        ) VALUES ($1, $2, $3, $4, 'ADMIN', $5, NOW())`,
        [id, current.status, newStatus, actorId, note || `Status changed to ${newStatus}`]
      );

      await client.query("COMMIT");
      return this.getById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async saveInspection(id, { itemConditions = [], adminNote = "", inspectionImages = [] } = {}, actorId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update conditions per item
      for (const item of itemConditions) {
        const itemId = item.id || item.returnItemId;
        const cond = item.condition || "RESELLABLE";
        const costRecovered = Number(item.costRecoveredAmount || 0);

        await client.query(
          `UPDATE sales_return_items
           SET item_condition = $1,
               cost_recovered_amount = $2
           WHERE id = $3 AND return_id = $4`,
          [cond, costRecovered, itemId, id]
        );
      }

      // Insert any inspection photos uploaded by admin
      for (const img of inspectionImages) {
        const imageUrl = img.imageUrl || img.image_url || img.url;
        const publicId = img.publicId || img.public_id || "inspection";

        await client.query(
          `INSERT INTO sales_return_images (
            return_id, return_item_id, uploaded_by, uploader_type, image_url, public_id, created_at
          ) VALUES ($1, $2, $3, 'ADMIN', $4, $5, NOW())`,
          [id, img.returnItemId || null, actorId, imageUrl, publicId]
        );
      }

      // Update status to INSPECTED
      const curr = await client.query(`SELECT status FROM sales_returns WHERE id = $1`, [id]);
      const prevStatus = curr.rows[0]?.status || "RECEIVED";

      await client.query(
        `UPDATE sales_returns
         SET status = 'INSPECTED',
             admin_note = COALESCE($1, admin_note),
             updated_at = NOW()
         WHERE id = $2`,
        [adminNote.trim() || null, id]
      );

      await client.query(
        `INSERT INTO sales_return_status_history (
          return_id, from_status, to_status, changed_by, actor_role, note, created_at
        ) VALUES ($1, $2, 'INSPECTED', $3, 'ADMIN', 'Warehouse condition inspection recorded', NOW())`,
        [id, prevStatus, actorId]
      );

      await client.query("COMMIT");
      return this.getById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async processRefund(id, {
    refundMethod,
    refundAccountDetails = {},
    returnShippingFee = 0,
    returnShippingPayer = "STORE",
    adminNote = "",
  } = {}, actorId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const returnRes = await client.query(
        `SELECT sr.id, sr.order_id, sr.return_number, sr.refund_amount, sr.status, o.order_number
         FROM sales_returns sr
         JOIN orders o ON o.id = sr.order_id
         WHERE sr.id = $1 FOR UPDATE`,
        [id]
      );

      if (!returnRes.rows[0]) throw new Error("Return request not found.");
      const ret = returnRes.rows[0];

      if (!["INSPECTED", "APPROVED", "RECEIVED"].includes(ret.status)) {
        throw new Error(`Cannot process refund while return is in '${ret.status}' status. Item inspection is recommended first.`);
      }

      const shippingFeeNum = Number(returnShippingFee) || 0;

      // If store pays return courier, add it to order_other_costs
      if (shippingFeeNum > 0 && returnShippingPayer === "STORE") {
        await client.query(
          `INSERT INTO order_other_costs (
            order_id, header, amount, note, created_by, created_at, updated_at
          ) VALUES ($1, 'Return Shipping', $2, $3, $4, NOW(), NOW())`,
          [
            ret.order_id,
            shippingFeeNum,
            `Return shipping for ${ret.return_number}`,
            actorId,
          ]
        );
      }

      // Record in payment_refunds
      const paymentRes = await client.query(
        `SELECT id FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [ret.order_id]
      );

      if (paymentRes.rows[0]) {
        await client.query(
          `INSERT INTO payment_refunds (
            payment_id, provider, amount, status, reason, completed_at, created_at
          ) VALUES ($1, $2, $3, 'SUCCEEDED', $4, NOW(), NOW())`,
          [
            paymentRes.rows[0].id,
            refundMethod,
            ret.refund_amount,
            `Sales return ${ret.return_number} (${refundMethod})`,
          ]
        );
      }

      // Mark return as REFUNDED
      await client.query(
        `UPDATE sales_returns
         SET status = 'REFUNDED',
             resolution_type = 'REFUND',
             refund_method = $1,
             refund_account_details = $2,
             return_shipping_fee = $3,
             return_shipping_payer = $4,
             admin_note = COALESCE($5, admin_note),
             updated_at = NOW()
         WHERE id = $6`,
        [
          refundMethod,
          JSON.stringify(refundAccountDetails || {}),
          shippingFeeNum,
          returnShippingPayer,
          adminNote.trim() || null,
          id,
        ]
      );

      // Record timeline
      const refundProofNote = refundMethod === "MFS"
        ? `Refund disbursed via ${refundAccountDetails.provider || "MFS"} (TrxID: ${refundAccountDetails.trx_id || refundAccountDetails.trxId || "N/A"})`
        : refundMethod === "BANK"
        ? `Refund disbursed via Bank Transfer (Ref: ${refundAccountDetails.bank_reference || refundAccountDetails.bankReference || "N/A"})`
        : `Cash refund disbursed (${refundAccountDetails.voucher_no || refundAccountDetails.receiptNo || "Handover completed"})`;

      await client.query(
        `INSERT INTO sales_return_status_history (
          return_id, from_status, to_status, changed_by, actor_role, note, created_at
        ) VALUES ($1, $2, 'REFUNDED', $3, 'ADMIN', $4, NOW())`,
        [id, ret.status, actorId, refundProofNote]
      );

      await client.query("COMMIT");
      return this.getById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = adminReturnRepository;

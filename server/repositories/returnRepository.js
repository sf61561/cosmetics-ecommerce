const { pool, query } = require("../config/db");

function generateReturnNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RET-${dateStr}-${randomPart}`;
}

const returnRepository = {
  async getOrderForReturn(orderId, customerId) {
    const orderRes = await query(
      `SELECT o.id, o.order_number, o.created_at, o.placed_at, o.delivered_at,
              COALESCE(o.status, o.order_status) AS status,
              COALESCE(o.grand_total, o.total_amount) AS grand_total
       FROM orders o
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, customerId]
    );

    if (!orderRes.rows[0]) return null;
    const order = orderRes.rows[0];

    // Fetch items with already returned quantities
    const itemsRes = await query(
      `SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.sku,
              oi.quantity, oi.unit_price, oi.cost_price,
              COALESCE(pv.image_url, pi.image_url) AS image_url,
              COALESCE(SUM(sri.quantity) FILTER (WHERE sr.status != 'REJECTED'), 0)::int AS already_returned_qty
       FROM order_items oi
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       LEFT JOIN LATERAL (
         SELECT image_url FROM product_images
         WHERE product_id = oi.product_id
         ORDER BY is_primary DESC, display_order ASC LIMIT 1
       ) pi ON true
       LEFT JOIN sales_return_items sri ON sri.order_item_id = oi.id
       LEFT JOIN sales_returns sr ON sr.id = sri.return_id
       WHERE oi.order_id = $1
       GROUP BY oi.id, pv.image_url, pi.image_url
       ORDER BY oi.id ASC`,
      [orderId]
    );

    const items = itemsRes.rows.map((it) => {
      const purchased = Number(it.quantity);
      const returned = Number(it.already_returned_qty);
      const returnable = Math.max(0, purchased - returned);
      return {
        id: it.id,
        productId: it.product_id,
        variantId: it.variant_id,
        productName: it.product_name,
        sku: it.sku,
        quantity: purchased,
        unitPrice: Number(it.unit_price),
        costPrice: it.cost_price !== null ? Number(it.cost_price) : null,
        imageUrl: it.image_url || null,
        alreadyReturnedQty: returned,
        returnableQty: returnable,
      };
    });

    // Check 7-day policy window
    const deliveredAt = order.delivered_at || order.created_at;
    const now = new Date();
    const diffDays = (now - new Date(deliveredAt)) / (1000 * 60 * 60 * 24);
    const isWithinPolicy = diffDays <= 7;

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      deliveredAt,
      isWithinPolicy,
      diffDays: Math.floor(diffDays),
      items,
      hasReturnableItems: items.some((it) => it.returnableQty > 0),
    };
  },

  async createReturn({
    orderId,
    customerId,
    reason,
    customerNote = "",
    refundMethod,
    refundAccountDetails = {},
    items = [],
    images = [],
    isWindowOverridden = false,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify order eligibility
      const orderCheck = await client.query(
        `SELECT id, order_number, delivered_at, created_at, status
         FROM orders
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [orderId, customerId]
      );

      if (!orderCheck.rows[0]) throw new Error("Order not found or does not belong to you.");
      const order = orderCheck.rows[0];

      const canonicalStatus = String(order.status).toLowerCase();
      if (canonicalStatus !== "delivered") {
        throw new Error("Returns can only be requested for delivered orders.");
      }

      // Verify return window
      const deliveredTime = new Date(order.delivered_at || order.created_at).getTime();
      const elapsedDays = (Date.now() - deliveredTime) / (1000 * 60 * 60 * 24);
      if (elapsedDays > 7 && !isWindowOverridden) {
        throw new Error("The 7-day return policy window has expired for this order.");
      }

      // Verify items & compute total refund amount
      let totalRefundAmount = 0;
      const verifiedItems = [];

      for (const reqItem of items) {
        const itemRes = await client.query(
          `SELECT oi.id, oi.product_id, oi.variant_id, oi.unit_price, oi.cost_price, oi.quantity,
                  COALESCE(SUM(sri.quantity) FILTER (WHERE sr.status != 'REJECTED'), 0)::int AS already_returned
           FROM order_items oi
           LEFT JOIN sales_return_items sri ON sri.order_item_id = oi.id
           LEFT JOIN sales_returns sr ON sr.id = sri.return_id
           WHERE oi.id = $1 AND oi.order_id = $2
           GROUP BY oi.id`,
          [reqItem.orderItemId, orderId]
        );

        if (!itemRes.rows[0]) throw new Error(`Invalid order item: ${reqItem.orderItemId}`);
        const it = itemRes.rows[0];
        const returnable = Number(it.quantity) - Number(it.already_returned);
        const qtyToReturn = Number(reqItem.quantity);

        if (qtyToReturn <= 0 || qtyToReturn > returnable) {
          throw new Error(`Requested return quantity (${qtyToReturn}) exceeds available returnable quantity (${returnable}).`);
        }

        const unitPrice = Number(it.unit_price);
        totalRefundAmount += unitPrice * qtyToReturn;

        verifiedItems.push({
          orderItemId: it.id,
          productId: it.product_id,
          variantId: it.variant_id,
          quantity: qtyToReturn,
          unitSellingPrice: unitPrice,
          unitCostPrice: it.cost_price !== null ? Number(it.cost_price) : null,
        });
      }

      // Check photo requirement
      const photoMandatoryReasons = ["DEFECTIVE_DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED"];
      if (photoMandatoryReasons.includes(reason) && (!images || images.length === 0)) {
        throw new Error("At least one photo evidence is required for damaged, wrong item, or not-as-described returns.");
      }

      const returnNumber = generateReturnNumber();

      // Insert return record
      const insertReturn = await client.query(
        `INSERT INTO sales_returns (
          return_number, order_id, customer_id, status, reason, customer_note,
          resolution_type, refund_amount, refund_method, refund_account_details,
          is_window_overridden, requested_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'REQUESTED', $4, $5,
          'REFUND', $6, $7, $8,
          $9, NOW(), NOW(), NOW()
        ) RETURNING *`,
        [
          returnNumber,
          orderId,
          customerId,
          reason,
          customerNote.trim() || null,
          totalRefundAmount,
          refundMethod,
          JSON.stringify(refundAccountDetails || {}),
          isWindowOverridden,
        ]
      );
      const returnRecord = insertReturn.rows[0];

      // Insert return items
      for (const it of verifiedItems) {
        await client.query(
          `INSERT INTO sales_return_items (
            return_id, order_item_id, product_id, variant_id, quantity,
            unit_selling_price, unit_cost_price, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            returnRecord.id,
            it.orderItemId,
            it.productId,
            it.variantId,
            it.quantity,
            it.unitSellingPrice,
            it.unitCostPrice,
          ]
        );
      }

      // Insert images
      for (const img of images) {
        const imageUrl = img.imageUrl || img.image_url || img.url;
        const publicId = img.publicId || img.public_id || "evidence";
        const fileSize = img.fileSize || img.file_size || null;
        const mimeType = img.mimeType || img.mime_type || null;
        const fileHash = img.fileHash || img.file_hash || null;

        await client.query(
          `INSERT INTO sales_return_images (
            return_id, uploaded_by, uploader_type, image_url, public_id,
            file_size, mime_type, file_hash, created_at
          ) VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, $6, $7, NOW())`,
          [
            returnRecord.id,
            customerId,
            imageUrl,
            publicId,
            fileSize,
            mimeType,
            fileHash,
          ]
        );
      }

      // Insert timeline entry
      await client.query(
        `INSERT INTO sales_return_status_history (
          return_id, from_status, to_status, changed_by, actor_role, note, created_at
        ) VALUES ($1, NULL, 'REQUESTED', $2, 'CUSTOMER', 'Return requested by customer', NOW())`,
        [returnRecord.id, customerId]
      );

      await client.query("COMMIT");
      return returnRecord;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async listByCustomer(customerId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM sales_returns WHERE customer_id = $1`,
      [customerId]
    );
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await query(
      `SELECT sr.id, sr.return_number, sr.order_id, sr.status, sr.reason,
              sr.refund_amount, sr.refund_method, sr.resolution_type,
              sr.requested_at, sr.completed_at, sr.created_at,
              o.order_number,
              COUNT(sri.id)::int AS item_count
       FROM sales_returns sr
       JOIN orders o ON o.id = sr.order_id
       LEFT JOIN sales_return_items sri ON sri.return_id = sr.id
       WHERE sr.customer_id = $1
       GROUP BY sr.id, o.order_number
       ORDER BY sr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limitNum, offset]
    );

    return {
      returns: dataRes.rows.map((row) => ({
        id: row.id,
        returnNumber: row.return_number,
        orderId: row.order_id,
        orderNumber: row.order_number,
        status: row.status,
        reason: row.reason,
        refundAmount: Number(row.refund_amount),
        refundMethod: row.refund_method,
        resolutionType: row.resolution_type,
        itemCount: Number(row.item_count || 0),
        requestedAt: row.requested_at,
        completedAt: row.completed_at,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
  },

  async getByIdForCustomer(returnId, customerId) {
    const returnRes = await query(
      `SELECT sr.id, sr.return_number, sr.order_id, sr.status, sr.reason,
              sr.customer_note, sr.rejection_reason, sr.info_needed_prompt,
              sr.resolution_type, sr.refund_amount, sr.refund_method,
              sr.refund_account_details, sr.return_shipping_payer,
              sr.requested_at, sr.approved_at, sr.received_at, sr.completed_at, sr.created_at,
              o.order_number
       FROM sales_returns sr
       JOIN orders o ON o.id = sr.order_id
       WHERE sr.id = $1 AND sr.customer_id = $2`,
      [returnId, customerId]
    );

    if (!returnRes.rows[0]) return null;
    const row = returnRes.rows[0];

    // Fetch items (strictly omit cost price & cost recovery from customer response)
    const itemsRes = await query(
      `SELECT sri.id, sri.order_item_id, sri.product_id, sri.variant_id,
              sri.quantity, sri.unit_selling_price,
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
      [returnId]
    );

    // Fetch images (customer evidence + admin inspection photos)
    const imagesRes = await query(
      `SELECT id, uploader_type, image_url, public_id, created_at
       FROM sales_return_images
       WHERE return_id = $1
       ORDER BY created_at ASC`,
      [returnId]
    );

    // Fetch timeline (customer-safe view)
    const historyRes = await query(
      `SELECT id, from_status, to_status, actor_role, note, created_at
       FROM sales_return_status_history
       WHERE return_id = $1
       ORDER BY created_at ASC`,
      [returnId]
    );

    return {
      id: row.id,
      returnNumber: row.return_number,
      orderId: row.order_id,
      orderNumber: row.order_number,
      status: row.status,
      reason: row.reason,
      customerNote: row.customer_note,
      rejectionReason: row.rejection_reason,
      infoNeededPrompt: row.info_needed_prompt,
      resolutionType: row.resolution_type,
      refundAmount: Number(row.refund_amount),
      refundMethod: row.refund_method,
      refundAccountDetails: row.refund_account_details,
      requestedAt: row.requested_at,
      approvedAt: row.approved_at,
      receivedAt: row.received_at,
      completedAt: row.completed_at,
      items: itemsRes.rows.map((it) => ({
        id: it.id,
        orderItemId: it.order_item_id,
        productId: it.product_id,
        productName: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_selling_price),
        lineTotal: Number(it.unit_selling_price) * Number(it.quantity),
        imageUrl: it.image_url || null,
      })),
      images: imagesRes.rows.map((img) => ({
        id: img.id,
        uploaderType: img.uploader_type,
        imageUrl: img.image_url,
        createdAt: img.created_at,
      })),
      timeline: historyRes.rows.map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        note: h.note,
        createdAt: h.created_at,
      })),
    };
  },

  async addCustomerPhotos(returnId, customerId, images = []) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const check = await client.query(
        `SELECT id, status FROM sales_returns WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
        [returnId, customerId]
      );
      if (!check.rows[0]) throw new Error("Return request not found.");
      if (check.rows[0].status !== "INFO_NEEDED") {
        throw new Error("Photos can only be updated when additional info is requested.");
      }

      for (const img of images) {
        const imageUrl = img.imageUrl || img.image_url || img.url;
        const publicId = img.publicId || img.public_id || "evidence";
        const fileSize = img.fileSize || img.file_size || null;
        const mimeType = img.mimeType || img.mime_type || null;
        const fileHash = img.fileHash || img.file_hash || null;

        await client.query(
          `INSERT INTO sales_return_images (
            return_id, uploaded_by, uploader_type, image_url, public_id,
            file_size, mime_type, file_hash, created_at
          ) VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, $6, $7, NOW())`,
          [returnId, customerId, imageUrl, publicId, fileSize, mimeType, fileHash]
        );
      }

      // Transition back to REQUESTED
      await client.query(
        `UPDATE sales_returns
         SET status = 'REQUESTED', updated_at = NOW()
         WHERE id = $1`,
        [returnId]
      );

      await client.query(
        `INSERT INTO sales_return_status_history (
          return_id, from_status, to_status, changed_by, actor_role, note, created_at
        ) VALUES ($1, 'INFO_NEEDED', 'REQUESTED', $2, 'CUSTOMER', 'Customer provided requested additional photos', NOW())`,
        [returnId, customerId]
      );

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = returnRepository;

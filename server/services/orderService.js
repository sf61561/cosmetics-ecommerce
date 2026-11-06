const { getClient, query } = require("../config/db");
const auditService = require("./auditService");
const emailService = require("./emailService");
const notificationService = require("./notificationService");

function fail(message, code = "ORDER_INVALID", status = 400) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

const ALLOWED_ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

function normalizeStatus(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "placed") return "pending";
  return raw;
}

function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

class OrderService {
  get allowedTransitions() {
    return ALLOWED_ORDER_TRANSITIONS;
  }

  async listCustomerOrders(userId) {
    const result = await query(
      `SELECT o.id, o.order_number, o.status, o.order_status, o.payment_status, o.payment_method,
              COALESCE(o.grand_total, o.total_amount) AS grand_total,
              COALESCE(o.shipping_fee, o.delivery_fee) AS shipping_fee,
              COALESCE(o.subtotal, o.product_subtotal, 0) AS subtotal,
              COALESCE(o.discount_total, o.coupon_discount, 0) AS discount_total,
              o.currency, o.created_at, o.placed_at,
              COUNT(oi.id)::int AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return result.rows.map((order) => {
      const canonicalStatus = normalizeStatus(order.status || order.order_status);
      return {
        id: order.id,
        orderNumber: order.order_number,
        status: canonicalStatus,
        orderStatus: canonicalStatus.toUpperCase(),
        paymentStatus: order.payment_status || "unpaid",
        paymentMethod: order.payment_method || "none",
        grandTotal: Number(order.grand_total),
        totalAmount: Number(order.grand_total),
        shippingFee: Number(order.shipping_fee),
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discount_total),
        currency: order.currency || "BDT",
        itemCount: Number(order.item_count || 0),
        placedAt: order.placed_at || order.created_at,
        createdAt: order.created_at,
      };
    });
  }

  async getCustomerOrder(id, userId) {
    const result = await query(
      `SELECT id, order_number, status, order_status, payment_status, payment_method,
              subtotal, discount_total, shipping_fee, tax_total, grand_total, currency,
              total_amount, delivery_fee, product_subtotal, product_discount, coupon_code,
              coupon_discount, delivery_zone, delivery_discount, recipient_name, recipient_phone,
              delivery_division, delivery_district, delivery_area, delivery_street_address,
              delivery_postal_code, shipping_name, shipping_phone, shipping_address,
              shipping_city, shipping_area, customer_note, admin_note, courier_name,
              tracking_number, placed_at, created_at, updated_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (!result.rows[0]) return null;
    const order = result.rows[0];
    const canonicalStatus = normalizeStatus(order.status || order.order_status);

    const items = await query(
      `SELECT oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.sku, oi.quantity, oi.unit_price,
              oi.product_discount, oi.line_total, COALESCE(pv.image_url, pi.image_url) AS image_url
       FROM order_items oi
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       LEFT JOIN LATERAL (
         SELECT image_url FROM product_images
         WHERE product_id = oi.product_id
         ORDER BY is_primary DESC, display_order ASC LIMIT 1
       ) pi ON true
       WHERE oi.order_id = $1 ORDER BY oi.id`,
      [id]
    );

    const history = await query(
      `SELECT id, from_status, to_status, note, created_at
       FROM order_status_history
       WHERE order_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id]
    );

    return {
      id: order.id,
      orderNumber: order.order_number,
      status: canonicalStatus,
      orderStatus: canonicalStatus.toUpperCase(),
      paymentStatus: order.payment_status || "unpaid",
      paymentMethod: order.payment_method || "none",
      subtotal: Number(order.subtotal ?? order.product_subtotal ?? 0),
      discountTotal: Number(order.discount_total ?? order.coupon_discount ?? 0),
      shippingFee: Number(order.shipping_fee ?? order.delivery_fee ?? 0),
      taxTotal: Number(order.tax_total ?? 0),
      grandTotal: Number(order.grand_total ?? order.total_amount ?? 0),
      currency: order.currency || "BDT",
      customerNote: order.customer_note || null,
      courierName: order.courier_name || null,
      trackingNumber: order.tracking_number || null,
      canCancel: canonicalStatus === "pending",
      placedAt: order.placed_at || order.created_at,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      shipping: {
        name: order.shipping_name || order.recipient_name,
        phone: order.shipping_phone || order.recipient_phone,
        address: order.shipping_address || order.delivery_street_address,
        city: order.shipping_city || order.delivery_district,
        area: order.shipping_area || order.delivery_area,
        division: order.delivery_division,
        postalCode: order.delivery_postal_code,
      },
      items: items.rows.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        productDiscount: Number(item.product_discount || 0),
        lineTotal: Number(item.line_total),
        imageUrl: item.image_url || null,
      })),
      history: history.rows.map((h) => ({
        id: h.id,
        fromStatus: h.from_status ? normalizeStatus(h.from_status) : null,
        toStatus: normalizeStatus(h.to_status),
        note: h.note,
        createdAt: h.created_at,
      })),
    };
  }

  async createOrder({ userId, sessionId, zone, couponCode = "", addressId, idempotencyKey, customerNote = "" }, actor = null, request = null) {
    if (!userId) fail("Sign in before placing an order.", "AUTH_REQUIRED", 401);
    if (!addressId) fail("A delivery address is required.", "ADDRESS_REQUIRED", 400);
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
      fail("A valid order submission key is required.", "IDEMPOTENCY_KEY_REQUIRED", 400);
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.actor_user_id', $1, true), set_config('app.actor_role', 'CUSTOMER', true)",
        [userId]
      );

      // Check idempotency
      const existingOrder = await client.query(
        `SELECT id, order_number, status, grand_total, total_amount, shipping_fee, delivery_fee,
                coupon_code, coupon_discount
         FROM orders WHERE user_id = $1 AND idempotency_key = $2 FOR UPDATE`,
        [userId, idempotencyKey]
      );
      if (existingOrder.rows[0]) {
        const existing = existingOrder.rows[0];
        await client.query("COMMIT");
        return {
          id: existing.id,
          orderNumber: existing.order_number,
          status: normalizeStatus(existing.status),
          grandTotal: Number(existing.grand_total || existing.total_amount),
          totalAmount: Number(existing.grand_total || existing.total_amount),
          shippingFee: Number(existing.shipping_fee || existing.delivery_fee),
          couponDiscount: Number(existing.coupon_discount || 0),
          reused: true,
        };
      }

      // 1. Fetch delivery address
      const addressResult = await client.query(
        `SELECT id, recipient_name, phone, division, district, area, street_address, postal_code
         FROM addresses WHERE id = $1 AND user_id = $2`,
        [addressId, userId]
      );
      if (!addressResult.rows[0]) fail("Selected delivery address was not found.", "ADDRESS_NOT_FOUND", 404);
      const addr = addressResult.rows[0];

      // Automatically infer delivery zone if not provided or invalid
      let effectiveZone = zone;
      if (!effectiveZone || !["INSIDE_DHAKA", "OUTSIDE_DHAKA"].includes(effectiveZone)) {
        const dist = (addr.district || "").toLowerCase();
        const div = (addr.division || "").toLowerCase();
        if (dist.includes("dhaka") || (!dist && div.includes("dhaka"))) {
          effectiveZone = "INSIDE_DHAKA";
        } else {
          effectiveZone = "OUTSIDE_DHAKA";
        }
      }

      // 2. Fetch cart items & lock products (never trust client prices)
      const itemsResult = await client.query(
        `SELECT ci.product_id, ci.variant_id, ci.quantity, p.name, p.sku, p.price, p.sale_price,
                p.stock_quantity, p.track_inventory, p.status, p.published_at,
                pv.id AS variant_row_id, pv.price AS variant_price, pv.compare_at_price AS variant_compare_at_price,
                pv.is_available AS variant_is_available, pv.is_active AS variant_is_active,
                (
                  SELECT COUNT(*)::int
                  FROM product_variants pvc
                  WHERE pvc.product_id = p.id AND pvc.deleted_at IS NULL AND pvc.options_key != 'default'
                ) AS custom_variant_count,
                (
                  SELECT string_agg(ov.value, ' / ')
                  FROM variant_option_values vov
                  JOIN option_values ov ON ov.id = vov.option_value_id
                  WHERE vov.variant_id = pv.id
                ) AS variant_name
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         LEFT JOIN product_variants pv ON pv.id = ci.variant_id AND pv.deleted_at IS NULL
         WHERE ci.user_id = $1
         FOR UPDATE OF p, ci`,
        [userId]
      );
      if (!itemsResult.rows.length) fail("Your shopping bag is empty.", "CART_EMPTY", 400);

      let productSubtotal = 0;
      let productDiscount = 0;
      const items = [];

      for (const item of itemsResult.rows) {
        if (item.status !== "ACTIVE" || (item.published_at && new Date(item.published_at) > new Date())) {
          fail(`Product "${item.name}" is no longer available.`, "PRODUCT_UNAVAILABLE", 400);
        }
        if (Number(item.custom_variant_count) > 0 && !item.variant_id) {
          fail(`Please select a shade or size for "${item.name}" before proceeding with checkout.`, "VARIANT_REQUIRED", 400);
        }
        if (item.variant_id) {
          if (!item.variant_row_id || !item.variant_is_active || !item.variant_is_available) {
            const vName = item.variant_name ? ` (${item.variant_name})` : "";
            fail(`The selected version of "${item.name}"${vName} is currently unavailable or out of stock.`, "VARIANT_UNAVAILABLE", 400);
          }
        }
        if (item.track_inventory && Number(item.stock_quantity) < Number(item.quantity)) {
          fail(`Insufficient stock for "${item.name}". Only ${item.stock_quantity} left.`, "STOCK_EXCEEDED", 400);
        }

        let unitPrice;
        let regularTotal;
        let lineTotal;
        let itemDiscount;

        if (item.variant_row_id) {
          unitPrice = Number(item.variant_price);
          const regularPrice =
            item.variant_compare_at_price !== null && Number(item.variant_compare_at_price) > unitPrice
              ? Number(item.variant_compare_at_price)
              : unitPrice;
          regularTotal = regularPrice * Number(item.quantity);
          lineTotal = money(unitPrice * Number(item.quantity));
          itemDiscount = money(regularTotal - lineTotal);
        } else {
          regularTotal = Number(item.price) * Number(item.quantity);
          unitPrice =
            item.sale_price !== null && Number(item.sale_price) < Number(item.price)
              ? Number(item.sale_price)
              : Number(item.price);
          lineTotal = money(unitPrice * Number(item.quantity));
          itemDiscount = money(regularTotal - lineTotal);
        }

        const snapshotName = item.variant_name ? `${item.name} (${item.variant_name})` : item.name;

        productSubtotal += lineTotal;
        productDiscount += itemDiscount;
        items.push({
          productId: item.product_id,
          variantId: item.variant_id || item.variant_row_id || null,
          name: snapshotName,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice,
          productDiscount: itemDiscount,
          lineTotal,
          stockQuantity: Number(item.stock_quantity),
          trackInventory: Boolean(item.track_inventory),
        });
      }

      // 3. Shipping calculation (Strict two-type system: INSIDE_DHAKA / OUTSIDE_DHAKA)
      const ruleResult = await client.query(
        `SELECT * FROM delivery_rules
         WHERE zone = $1 AND is_active = true
         LIMIT 1
         FOR UPDATE`,
        [effectiveZone]
      );
      const rule = ruleResult.rows[0];
      if (!rule) fail("Delivery service is currently unavailable for this destination.", "DELIVERY_ZONE_UNAVAILABLE", 400);
      let deliveryCharge = Number(rule.delivery_charge);
      const deliveryChargeBeforePromotion = deliveryCharge;
      let couponDiscount = 0;
      let deliveryDiscount = 0;
      let coupon = null;

      const normalizedCode = String(couponCode || "").trim().toUpperCase();
      if (normalizedCode) {
        const couponResult = await client.query(
          "SELECT * FROM coupons WHERE code = $1 FOR UPDATE",
          [normalizedCode]
        );
        coupon = couponResult.rows[0];
        if (!coupon || !coupon.is_active) fail("This coupon is invalid or inactive.", "COUPON_INVALID", 400);
        const now = new Date();
        if (coupon.starts_at && now < new Date(coupon.starts_at)) fail("This coupon is not active yet.", "COUPON_NOT_STARTED", 400);
        if (coupon.expires_at && now >= new Date(coupon.expires_at)) fail("This coupon has expired.", "COUPON_EXPIRED", 400);
        if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
          fail("This coupon has reached its redemption limit.", "COUPON_USAGE_LIMIT_REACHED", 400);
        }
        if (coupon.per_customer_limit !== null) {
          const countResult = await client.query(
            "SELECT COUNT(*)::int AS count FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2",
            [coupon.id, userId]
          );
          if (countResult.rows[0].count >= coupon.per_customer_limit) {
            fail("You have reached this coupon's usage limit.", "CUSTOMER_USAGE_LIMIT_REACHED", 400);
          }
        }
        if (productSubtotal < Number(coupon.min_order_amount)) {
          fail("This coupon's minimum order requirement was not met.", "MINIMUM_ORDER_NOT_MET", 400);
        }
        if (coupon.discount_type === "FREE_DELIVERY") {
          deliveryDiscount += deliveryCharge;
          deliveryCharge = 0;
        } else {
          couponDiscount =
            coupon.discount_type === "PERCENTAGE"
              ? (productSubtotal * Number(coupon.discount_value)) / 100
              : Number(coupon.discount_value);
          if (coupon.max_discount_amount !== null) {
            couponDiscount = Math.min(couponDiscount, Number(coupon.max_discount_amount));
          }
          couponDiscount = money(Math.min(couponDiscount, productSubtotal));
        }
      }

      const totalDiscount = money(productDiscount + couponDiscount + deliveryDiscount);
      const grandTotal = money(productSubtotal - couponDiscount + deliveryCharge);
      const orderNumber = generateOrderNumber();

      // 4. Create Order with snapshot values
      const orderResult = await client.query(
        `INSERT INTO orders
         (user_id, order_number, status, order_status, payment_status, payment_method,
          subtotal, discount_total, shipping_fee, tax_total, grand_total, currency,
          shipping_name, shipping_phone, shipping_address, shipping_city, shipping_area,
          recipient_name, recipient_phone, delivery_division, delivery_district, delivery_area,
          delivery_street_address, delivery_postal_code, customer_note, idempotency_key,
          total_amount, delivery_fee, product_subtotal, product_discount, coupon_code,
          coupon_discount, delivery_zone, delivery_discount, placed_at)
         VALUES ($1, $2, 'pending', 'PENDING', 'unpaid', 'none',
                 $3, $4, $5, 0.00, $6, 'BDT',
                 $7, $8, $9, $10, $11,
                 $7, $8, $12, $10, $11,
                 $9, $13, $14, $15,
                 $6, $5, $3, $16, $17,
                 $18, $19, $20, NOW())
         RETURNING id, order_number, status, grand_total, shipping_fee, subtotal, discount_total`,
        [
          userId,
          orderNumber,
          productSubtotal,
          totalDiscount,
          deliveryCharge,
          grandTotal,
          addr.recipient_name,
          addr.phone,
          addr.street_address,
          addr.district,
          addr.area,
          addr.division,
          addr.postal_code,
          customerNote ? customerNote.trim() : null,
          idempotencyKey,
          productDiscount,
          coupon?.code || null,
          couponDiscount,
          effectiveZone,
          deliveryDiscount,
        ]
      );
      const order = orderResult.rows[0];

      // 5. Create order_items and atomically deduct inventory
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items
           (order_id, product_id, variant_id, product_name, sku, quantity, unit_price, product_discount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [order.id, item.productId, item.variantId, item.name, item.sku, item.quantity, item.unitPrice, item.productDiscount, item.lineTotal]
        );

        if (item.trackInventory) {
          // Atomic inventory deduction with WHERE stock_quantity >= qty check
          const updateRes = await client.query(
            `UPDATE products 
             SET stock_quantity = stock_quantity - $1, 
                 updated_at = NOW() 
             WHERE id = $2 AND track_inventory = true AND stock_quantity >= $1`,
            [item.quantity, item.productId]
          );
          if (updateRes.rowCount === 0) {
            fail(`Product "${item.name}" was just claimed by another customer. Insufficient stock.`, "STOCK_EXCEEDED", 400);
          }

          await auditService.record({
            actor,
            action: "INVENTORY_ADJUSTED",
            entityType: "INVENTORY",
            entityId: item.productId,
            previousValues: { stockQuantity: item.stockQuantity },
            newValues: { stockQuantity: item.stockQuantity - item.quantity },
            metadata: { reason: "ORDER_PLACED", orderId: order.id, quantityDelta: -item.quantity },
          }, { client, request });
        }
      }

      // 6. Record status history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
         VALUES ($1, NULL, 'pending', $2, 'Order placed by customer')`,
        [order.id, userId]
      );

      // 7. Insert payment record (COD due)
      await client.query(
        `INSERT INTO payments (order_id, payment_method, amount, currency, status)
         VALUES ($1, 'COD', $2, 'BDT', 'PENDING')`,
        [order.id, grandTotal]
      );

      // 8. Record audit log
      await auditService.record({
        actor,
        action: "ORDER_CREATED",
        entityType: "ORDER",
        entityId: order.id,
        newValues: { orderStatus: "PENDING", status: "pending", grandTotal, shippingFee: deliveryCharge },
        metadata: { orderNumber },
      }, { client, request });

      // 9. Coupon redemption
      if (coupon) {
        await client.query(
          "INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_amount) VALUES ($1,$2,$3,$4)",
          [coupon.id, userId, order.id, couponDiscount + deliveryDiscount]
        );
        await client.query("UPDATE coupons SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1", [coupon.id]);
      }

      // 10. Clear user's cart
      await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

      await client.query("COMMIT");

      // Dispatch centralized notification asynchronously (post-commit)
      notificationService.notify("order.placed", {
        userId,
        data: {
          orderId: order.id,
          orderNumber,
          total: grandTotal,
          customerName: actor?.name || addr.recipient_name,
          customerEmail: actor?.email,
          customerPhone: addr.phone || actor?.phone,
          shippingAddress: addr.address_line,
          paymentMethod: order.payment_method,
        },
      }).catch((notifErr) => console.warn("Order placed notification error:", notifErr.message));

      // Alert administrators of incoming order
      notificationService.notifyAdmin("admin.order_placed", {
        orderId: order.id,
        orderNumber,
        total: grandTotal,
        customerName: actor?.name || addr.recipient_name,
        paymentMethod: order.payment_method,
      }).catch((adminErr) => console.warn("Admin order notification error:", adminErr.message));

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: "pending",
        grandTotal: Number(order.grand_total),
        totalAmount: Number(order.grand_total),
        shippingFee: Number(order.shipping_fee),
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discount_total),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505" && error.constraint === "idx_orders_user_idempotency_key") {
        const retryResult = await client.query(
          `SELECT id, order_number, status, grand_total, total_amount, shipping_fee, delivery_fee
           FROM orders WHERE user_id = $1 AND idempotency_key = $2`,
          [userId, idempotencyKey]
        );
        const existing = retryResult.rows[0];
        if (existing) {
          return {
            id: existing.id,
            orderNumber: existing.order_number,
            status: normalizeStatus(existing.status),
            grandTotal: Number(existing.grand_total || existing.total_amount),
            totalAmount: Number(existing.grand_total || existing.total_amount),
            shippingFee: Number(existing.shipping_fee || existing.delivery_fee),
            reused: true,
          };
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelCustomerOrder(orderId, userId, note = "Customer requested cancellation", actor = null, request = null) {
    if (!userId) fail("Authentication required.", "AUTH_REQUIRED", 401);

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(
        `SELECT id, order_number, status, order_status, user_id, grand_total, total_amount
         FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (!orderRes.rows[0]) fail("Order not found.", "ORDER_NOT_FOUND", 404);
      const order = orderRes.rows[0];

      if (order.user_id !== userId) {
        fail("You are not authorized to cancel this order.", "FORBIDDEN", 403);
      }

      const currentStatus = normalizeStatus(order.status || order.order_status);
      if (currentStatus !== "pending") {
        fail(
          `Order cannot be cancelled in "${currentStatus}" status. Only pending orders can be cancelled self-service.`,
          "INVALID_CANCELLATION_STATUS",
          400
        );
      }

      // Transition to cancelled
      await client.query(
        `UPDATE orders
         SET status = 'cancelled', order_status = 'CANCELLED', updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      // Atomically restore stock
      const items = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        [orderId]
      );
      for (const item of items.rows) {
        await client.query(
          `UPDATE products
           SET stock_quantity = stock_quantity + $1,
               updated_at = NOW()
           WHERE id = $2 AND track_inventory = true`,
          [item.quantity, item.product_id]
        );
      }

      // Record in order_status_history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
         VALUES ($1, 'pending', 'cancelled', $2, $3)`,
        [orderId, userId, note || "Cancelled by customer"]
      );

      // Invalidate pending payments
      await client.query(
        `UPDATE payments SET status = 'CANCELLED', updated_at = NOW()
         WHERE order_id = $1 AND status = 'PENDING'`,
        [orderId]
      );

      // Audit log
      await auditService.record({
        actor,
        action: "ORDER_STATUS_CHANGED",
        entityType: "ORDER",
        entityId: orderId,
        previousValues: { status: "pending", orderStatus: "PENDING" },
        newValues: { status: "cancelled", orderStatus: "CANCELLED" },
        metadata: { reason: note || "Customer self-service cancellation" },
      }, { client, request });

      await client.query("COMMIT");

      // Centralized notification for customer and admin
      notificationService.notify("order.cancelled", {
        userId: order.user_id,
        data: {
          orderId,
          orderNumber: order.order_number,
          reason: note || "Cancelled by customer request",
          customerName: actor?.name,
          customerEmail: actor?.email,
        },
      }).catch((err) => console.warn("Order cancelled notification error:", err.message));

      notificationService.notifyAdmin("admin.order_cancelled", {
        orderId,
        orderNumber: order.order_number,
        customerName: actor?.name || "Customer",
        reason: note || "Customer self-service cancellation",
      }).catch((err) => console.warn("Admin order cancellation notification error:", err.message));

      return {
        id: orderId,
        orderNumber: order.order_number,
        status: "cancelled",
        orderStatus: "CANCELLED",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(orderId, targetStatus, { note = "", courierName = "", trackingNumber = "", adminNote = "" } = {}, actor = null, request = null) {
    const normalizedTarget = normalizeStatus(targetStatus);
    const validStatuses = Object.keys(ALLOWED_ORDER_TRANSITIONS);
    if (!validStatuses.includes(normalizedTarget)) {
      fail(`Unsupported order status: "${targetStatus}". Supported statuses: ${validStatuses.join(", ")}`, "INVALID_STATUS", 400);
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(
        `SELECT o.id, o.order_number, o.status, o.order_status, o.user_id, o.grand_total,
                o.total_amount, o.payment_status, o.courier_name, o.tracking_number,
                u.email AS customer_email, u.name AS customer_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.id = $1 FOR UPDATE OF o`,
        [orderId]
      );
      if (!orderRes.rows[0]) fail("Order not found.", "ORDER_NOT_FOUND", 404);
      const order = orderRes.rows[0];

      const currentStatus = normalizeStatus(order.status || order.order_status);
      if (currentStatus === normalizedTarget) {
        // No status change, just update metadata if provided
        if (courierName || trackingNumber || adminNote) {
          await client.query(
            `UPDATE orders SET
               courier_name = COALESCE($1, courier_name),
               tracking_number = COALESCE($2, tracking_number),
               admin_note = COALESCE($3, admin_note),
               updated_at = NOW()
             WHERE id = $4`,
            [courierName || null, trackingNumber || null, adminNote || null, orderId]
          );
        }
        await client.query("COMMIT");
        return {
          id: order.id,
          orderNumber: order.order_number,
          status: currentStatus,
          orderStatus: currentStatus.toUpperCase(),
        };
      }

      // Check state machine transitions
      const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(normalizedTarget)) {
        fail(
          `Invalid status transition from "${currentStatus}" to "${normalizedTarget}". Allowed transitions: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}.`,
          "INVALID_STATUS_TRANSITION",
          400
        );
      }

      // Inventory restoral on cancellation or return
      if (["cancelled", "returned"].includes(normalizedTarget) && !["cancelled", "returned"].includes(currentStatus)) {
        const items = await client.query(
          "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
          [orderId]
        );
        for (const item of items.rows) {
          await client.query(
            `UPDATE products
             SET stock_quantity = stock_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2 AND track_inventory = true`,
            [item.quantity, item.product_id]
          );

          await auditService.record({
            actor,
            action: "INVENTORY_ADJUSTED",
            entityType: "INVENTORY",
            entityId: item.product_id,
            newValues: { reason: `ORDER_${normalizedTarget.toUpperCase()}` },
            metadata: { orderId, quantityDelta: item.quantity },
          }, { client, request });
        }
      }

      // Delivered handling: mark delivered_at and update payment for COD
      const isDelivered = normalizedTarget === "delivered";
      let paymentStatusUpdate = "";
      if (isDelivered) {
        paymentStatusUpdate = ", payment_status = 'paid'";
        await client.query(
          `UPDATE payments SET status = 'SUCCEEDED', paid_at = NOW(), updated_at = NOW()
           WHERE order_id = $1 AND status = 'PENDING'`,
          [orderId]
        );
      }

      const updatedCourier = courierName || order.courier_name;
      const updatedTracking = trackingNumber || order.tracking_number;

      const updateOrderRes = await client.query(
        `UPDATE orders
         SET status = $1::varchar,
             order_status = $2::varchar,
             courier_name = COALESCE($3, courier_name),
             tracking_number = COALESCE($4, tracking_number),
             admin_note = COALESCE($5, admin_note),
             delivered_at = ${isDelivered ? "COALESCE(delivered_at, NOW())" : "delivered_at"}
             ${paymentStatusUpdate},
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, order_number, status, order_status, delivered_at, courier_name, tracking_number`,
        [
          normalizedTarget,
          normalizedTarget.toUpperCase(),
          courierName || null,
          trackingNumber || null,
          adminNote || null,
          orderId,
        ]
      );

      // Record in order_status_history
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, currentStatus, normalizedTarget, actor?.id || null, note || `Status updated to ${normalizedTarget}`]
      );

      // Record audit log
      await auditService.record({
        actor,
        action: "ORDER_STATUS_CHANGED",
        entityType: "ORDER",
        entityId: orderId,
        previousValues: { status: currentStatus, orderStatus: currentStatus.toUpperCase() },
        newValues: { status: normalizedTarget, orderStatus: normalizedTarget.toUpperCase() },
        metadata: { note, courierName: updatedCourier, trackingNumber: updatedTracking },
      }, { client, request });

      await client.query("COMMIT");

      // Centralized notification based on target status
      const eventTypeMap = {
        confirmed: "order.confirmed",
        shipped: "order.shipped",
        delivered: "order.delivered",
        cancelled: "order.cancelled",
      };
      const eventType = eventTypeMap[normalizedTarget];
      if (eventType) {
        notificationService.notify(eventType, {
          userId: order.user_id,
          data: {
            orderId,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            courierName: updatedCourier,
            trackingNumber: updatedTracking,
            note,
            reason: note,
          },
        }).catch((err) => console.warn("Order status notification error:", err.message));
      }

      return updateOrderRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderShipping(orderId, { courierName, trackingNumber, adminNote }, actor = null, request = null) {
    const res = await query(
      `UPDATE orders
       SET courier_name = COALESCE($1, courier_name),
           tracking_number = COALESCE($2, tracking_number),
           admin_note = COALESCE($3, admin_note),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, order_number, courier_name, tracking_number, admin_note`,
      [courierName || null, trackingNumber || null, adminNote || null, orderId]
    );
    if (!res.rows[0]) fail("Order not found.", "ORDER_NOT_FOUND", 404);

    await auditService.record({
      actor,
      action: "ORDER_UPDATED",
      entityType: "ORDER",
      entityId: orderId,
      newValues: { courierName, trackingNumber, adminNote },
    }, { request });

    return res.rows[0];
  }
}

module.exports = new OrderService();

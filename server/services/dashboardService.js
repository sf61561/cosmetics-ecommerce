const { query } = require("../config/db");

const RANGES = {
  today: { days: 1, bucket: "hour", step: "1 hour" },
  "7": { days: 7, bucket: "day", step: "1 day" },
  "30": { days: 30, bucket: "day", step: "1 day" },
  "90": { days: 90, bucket: "week", step: "1 week" },
};

function getRange(value) {
  const key = Object.hasOwn(RANGES, value) ? value : "30";
  const range = RANGES[key];
  const currentStart = `(date_trunc('day', NOW() AT TIME ZONE 'Asia/Dhaka') - INTERVAL '${range.days - 1} days') AT TIME ZONE 'Asia/Dhaka'`;
  const previousStart = key === "today"
    ? `((${currentStart}) - INTERVAL '1 day')`
    : `((${currentStart}) - INTERVAL '${range.days} days')`;
  const previousEnd = key === "today" ? "(NOW() - INTERVAL '1 day')" : currentStart;
  const seriesStart = range.bucket === "week"
    ? "(date_trunc('week', current_start AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')"
    : "current_start";
  const seriesEnd = range.bucket === "hour"
    ? "(date_trunc('hour', NOW() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')"
    : range.bucket === "week"
      ? "(date_trunc('week', NOW() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')"
      : "(date_trunc('day', NOW() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')";

  return {
    key,
    ...range,
    currentStart,
    previousStart,
    previousEnd,
    seriesStart,
    seriesEnd,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name || "Guest customer",
    totalAmount: Number(row.total_amount || 0),
    orderStatus: row.order_status,
    createdAt: row.created_at,
  };
}

async function getOverview(rangeValue = "30") {
  const range = getRange(rangeValue);
  const boundsCte = `
    WITH bounds AS (
      SELECT ${range.currentStart} AS current_start,
             NOW() AS current_end,
             ${range.previousStart} AS previous_start,
             ${range.previousEnd} AS previous_end
    )
  `;

  const [metricsResult, salesResult, recentOrdersResult, topProductsResult, inventoryResult] = await Promise.all([
    query(`${boundsCte}
      SELECT
        COALESCE((
          SELECT SUM(o.total_amount)
          FROM orders o, bounds b
          WHERE o.order_status = 'DELIVERED'
            AND o.delivered_at >= b.current_start
            AND o.delivered_at < b.current_end
        ), 0) AS total_sales,
        (
          SELECT COUNT(*)::int
          FROM orders o, bounds b
          WHERE o.order_status = 'DELIVERED'
            AND o.delivered_at >= b.current_start
            AND o.delivered_at < b.current_end
        ) AS delivered_orders,
        COALESCE((
          SELECT SUM(o.total_amount)
          FROM orders o, bounds b
          WHERE o.order_status = 'DELIVERED'
            AND o.delivered_at >= b.previous_start
            AND o.delivered_at < b.previous_end
        ), 0) AS previous_sales,
        (
          SELECT COUNT(*)::int
          FROM orders o, bounds b
          WHERE o.created_at >= b.current_start
            AND o.created_at < b.current_end
        ) AS total_orders,
        (
          SELECT COUNT(*)::int
          FROM users u, bounds b
          WHERE u.role = 'CUSTOMER'
            AND u.created_at >= b.current_start
            AND u.created_at < b.current_end
        ) AS total_customers,
        (SELECT COUNT(*)::int FROM products WHERE status = 'ACTIVE') AS active_products,
        (
          SELECT COUNT(*)::int
          FROM orders o, bounds b
          WHERE o.created_at >= b.current_start
            AND o.created_at < b.current_end
            AND o.order_status IN ('PENDING', 'PLACED', 'PROCESSING')
        ) AS pending_orders,
        (
          SELECT COUNT(*)::int
          FROM products
          WHERE status = 'ACTIVE'
            AND track_inventory = true
            AND stock_quantity <= low_stock_threshold
        ) AS low_stock_products
    `),
    query(`
      WITH bounds AS (
        SELECT ${range.currentStart} AS current_start,
               NOW() AS current_end
      ),
      buckets AS (
        SELECT generate_series(${range.seriesStart}, ${range.seriesEnd}, INTERVAL '${range.step}') AS period
        FROM bounds
      )
      SELECT buckets.period,
             COALESCE(SUM(o.total_amount), 0) AS revenue,
             COUNT(o.id)::int AS order_count
      FROM buckets
      CROSS JOIN bounds
      LEFT JOIN orders o
        ON o.order_status = 'DELIVERED'
       AND o.delivered_at >= buckets.period
       AND o.delivered_at < buckets.period + INTERVAL '${range.step}'
       AND o.delivered_at >= bounds.current_start
       AND o.delivered_at < bounds.current_end
      GROUP BY buckets.period
      ORDER BY buckets.period ASC
    `),
    query(`
      SELECT o.id, o.order_number, o.total_amount, o.order_status,
             o.created_at, u.name AS customer_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 8
    `),
    query(`
      SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::int AS quantity,
             SUM(oi.line_total)::numeric AS line_total,
             pi.image_url, p.name AS current_product_name, b.name AS brand_name
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images
        WHERE product_id = oi.product_id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) pi ON true
      WHERE o.order_status = 'DELIVERED'
        AND o.delivered_at >= ${range.currentStart}
        AND o.delivered_at < NOW()
      GROUP BY oi.product_id, oi.product_name,
               pi.image_url, p.name, b.name
      ORDER BY SUM(oi.quantity) DESC, SUM(oi.line_total) DESC
      LIMIT 5
    `),
    query(`
      SELECT p.id, p.name, p.stock_quantity, p.low_stock_threshold,
             pi.image_url
      FROM products p
      LEFT JOIN LATERAL (
        SELECT image_url FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) pi ON true
      WHERE p.status = 'ACTIVE'
        AND p.track_inventory = true
        AND p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC, p.name ASC
      LIMIT 8
    `),
  ]);

  const metrics = metricsResult.rows[0] || {};
  const totalSales = Number(metrics.total_sales || 0);
  const deliveredOrders = Number(metrics.delivered_orders || 0);
  const previousSales = Number(metrics.previous_sales || 0);

  return {
    range: range.key,
    bucket: range.bucket,
    metrics: {
      totalSales,
      deliveredOrders,
      averageOrderValue: deliveredOrders ? totalSales / deliveredOrders : 0,
      previousSales,
      salesChangePercent: previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : null,
      totalOrders: Number(metrics.total_orders || 0),
      totalCustomers: Number(metrics.total_customers || 0),
      activeProducts: Number(metrics.active_products || 0),
      pendingOrders: Number(metrics.pending_orders || 0),
      lowStockProducts: Number(metrics.low_stock_products || 0),
    },
    sales: salesResult.rows.map((row) => ({
      period: row.period,
      revenue: Number(row.revenue || 0),
      orderCount: Number(row.order_count || 0),
    })),
    recentOrders: recentOrdersResult.rows.map(mapOrder),
    topProducts: topProductsResult.rows.map((row) => ({
      productId: row.product_id,
      name: row.current_product_name || row.product_name,
      brandName: row.brand_name,
      unitsSold: Number(row.quantity || 0),
      salesAmount: Number(row.line_total || 0),
      imageUrl: row.image_url,
    })),
    inventoryAlerts: inventoryResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      stockQuantity: Number(row.stock_quantity || 0),
      lowStockThreshold: Number(row.low_stock_threshold || 0),
      imageUrl: row.image_url,
    })),
  };
}

module.exports = { getOverview };

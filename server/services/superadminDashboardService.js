const { query } = require("../config/db");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHARTS_CACHE_TTL_MS = 3 * 60 * 1000;
const chartsCache = new Map();

function formatDhakaDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateStr, days) {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function resolveDateRange({ from, to, preset } = {}) {
  const todayStr = formatDhakaDate(new Date());
  let startDate;
  let endDate;

  if (from && to) {
    if (!DATE_RE.test(String(from)) || !DATE_RE.test(String(to))) {
      const err = new Error("Dates must use YYYY-MM-DD format.");
      err.statusCode = 400;
      throw err;
    }
    startDate = String(from);
    endDate = String(to);
  } else if (preset === "today") {
    startDate = todayStr;
    endDate = todayStr;
  } else if (preset === "7d") {
    startDate = addDays(todayStr, -6);
    endDate = todayStr;
  } else if (preset === "month") {
    startDate = `${todayStr.slice(0, 7)}-01`;
    endDate = todayStr;
  } else {
    startDate = addDays(todayStr, -29);
    endDate = todayStr;
  }

  if (startDate > endDate) {
    const err = new Error("Start date cannot be after end date.");
    err.statusCode = 400;
    throw err;
  }

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  const spanDays = Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;

  if (spanDays > 366) {
    const err = new Error("Date range cannot exceed 366 days.");
    err.statusCode = 400;
    throw err;
  }

  const prevEndDate = addDays(startDate, -1);
  const prevStartDate = addDays(prevEndDate, -(spanDays - 1));

  let bucket = "day";
  let step = "1 day";
  if (spanDays <= 2) {
    bucket = "hour";
    step = "1 hour";
  } else if (spanDays <= 45) {
    bucket = "day";
    step = "1 day";
  } else if (spanDays <= 180) {
    bucket = "week";
    step = "1 week";
  } else {
    bucket = "month";
    step = "1 month";
  }

  return {
    from: startDate,
    to: endDate,
    prevFrom: prevStartDate,
    prevTo: prevEndDate,
    spanDays,
    bucket,
    step,
  };
}

function calcDelta(current, previous, compareEnabled) {
  if (!compareEnabled) return null;
  const prevNum = Number(previous || 0);
  if (!Number.isFinite(prevNum) || prevNum === 0) return null;
  const currNum = Number(current || 0);
  return Number((((currNum - prevNum) / Math.abs(prevNum)) * 100).toFixed(1));
}

function roundMoney(val) {
  return Number(Number(val || 0).toFixed(2));
}

function parseUserAgent(ua) {
  if (!ua || typeof ua !== "string") return "Unknown device";
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "Desktop";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return `${browser} · ${os}`;
}

function formatActivityMessage(row) {
  const actorName = row.actor_name || row.actor_email || row.actor_type || "System";
  const meta = row.metadata || {};
  const entityShort = row.entity_id ? `#${String(row.entity_id).slice(0, 8)}` : "";

  switch (row.action) {
    case "ORDER_COSTS_UPDATED":
      return `${actorName} entered item costs for Order ${meta.orderNumber || entityShort}`;
    case "ORDER_OTHER_COST_ADDED":
      return `${actorName} added an expense (${meta.header || "Cost"}) to Order ${meta.orderNumber || entityShort}`;
    case "ORDER_OTHER_COST_UPDATED":
      return `${actorName} updated an expense on Order ${meta.orderNumber || entityShort}`;
    case "ORDER_OTHER_COST_DELETED":
      return `${actorName} removed an expense from Order ${meta.orderNumber || entityShort}`;
    case "ORDER_STATUS_CHANGED":
      return `${actorName} updated Order ${meta.orderNumber || entityShort} status`;
    case "RETURN_APPROVED":
      return `${actorName} approved Return ${meta.returnNumber || entityShort}`;
    case "RETURN_REJECTED":
      return `${actorName} rejected Return ${meta.returnNumber || entityShort}`;
    case "RETURN_INSPECTED":
      return `${actorName} completed warehouse inspection for Return ${meta.returnNumber || entityShort}`;
    case "RETURN_REFUNDED":
      return `${actorName} disbursed refund for Return ${meta.returnNumber || entityShort}`;
    case "RETURN_COMPLETED":
      return `${actorName} finalized Return ${meta.returnNumber || entityShort}`;
    case "ADMIN_INVITE_SENT":
      return `${actorName} sent an admin invitation${meta.email ? ` to ${meta.email}` : ""}`;
    case "ADMIN_INVITE_RESENT":
      return `${actorName} resent an admin invitation`;
    case "ADMIN_INVITE_CANCELLED":
      return `${actorName} cancelled a pending admin invitation`;
    case "ADMIN_INVITE_ACCEPTED":
      return `${actorName} activated their administrator account`;
    case "ADMIN_PERMISSIONS_UPDATED":
      return `${actorName} updated administrator permissions for ${entityShort || "an admin"}`;
    case "ADMIN_STATUS_CHANGED":
      return `${actorName} changed account status for admin ${entityShort}`;
    case "ADMIN_FORCE_LOGOUT":
      return `${actorName} terminated all sessions for admin ${entityShort}`;
    case "ADMIN_PASSWORD_RESET_TRIGGERED":
      return `${actorName} dispatched a password reset link for admin ${entityShort}`;
    case "PRESET_CREATED":
      return `${actorName} created permission preset${meta.name ? ` "${meta.name}"` : ""}`;
    case "PRESET_UPDATED":
      return `${actorName} updated permission preset${meta.name ? ` "${meta.name}"` : ""}`;
    case "PRESET_DELETED":
      return `${actorName} deleted a permission preset`;
    case "LOGIN_SUCCEEDED":
      return `${actorName} signed in successfully`;
    case "LOGIN_FAILED":
      return `Failed sign-in attempt (${meta.reason || "Invalid credentials"})`;
    case "ACCESS_DENIED":
      return `${actorName} blocked from unauthorized action (${meta.path || meta.reason || "403"})`;
    default:
      return `${actorName} performed ${String(row.action || "").toLowerCase().replaceAll("_", " ")} on ${row.entity_type} ${entityShort}`.trim();
  }
}

async function fetchPeriodKpis(startDate, endDate) {
  const sql = `
    WITH bounds AS (
      SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
             (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
    ),
    delivered_orders AS (
      SELECT o.id, o.total_amount
      FROM orders o, bounds b
      WHERE o.order_status = 'DELIVERED'
        AND o.delivered_at >= b.start_ts
        AND o.delivered_at < b.end_ts
    ),
    item_profit AS (
      SELECT
        COALESCE(SUM(
          CASE WHEN oi.cost_price IS NOT NULL
            THEN oi.line_total - (oi.cost_price * oi.quantity)
            ELSE 0
          END
        ), 0) AS costed_item_profit,
        COUNT(DISTINCT CASE WHEN oi.cost_price IS NULL THEN d.id END)::int AS cost_pending_orders
      FROM delivered_orders d
      JOIN order_items oi ON oi.order_id = d.id
    ),
    other_costs AS (
      SELECT COALESCE(SUM(ooc.amount), 0) AS total_other_costs
      FROM delivered_orders d
      JOIN order_other_costs ooc ON ooc.order_id = d.id
    ),
    returns_agg AS (
      SELECT
        COALESCE(SUM(sr.refund_amount), 0) AS returns_value,
        COUNT(*)::int AS returns_count
      FROM sales_returns sr, bounds b
      WHERE sr.status <> 'REJECTED'
        AND COALESCE(sr.requested_at, sr.created_at) >= b.start_ts
        AND COALESCE(sr.requested_at, sr.created_at) < b.end_ts
    ),
    customers_agg AS (
      SELECT COUNT(*)::int AS new_customers
      FROM users u, bounds b
      WHERE u.role = 'CUSTOMER'
        AND u.created_at >= b.start_ts
        AND u.created_at < b.end_ts
    ),
    pending_agg AS (
      SELECT COUNT(*)::int AS pending_orders
      FROM orders o, bounds b
      WHERE o.created_at >= b.start_ts
        AND o.created_at < b.end_ts
        AND o.order_status IN ('PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED')
    )
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM delivered_orders) AS total_sales,
      (SELECT COUNT(*)::int FROM delivered_orders) AS delivered_orders,
      (SELECT costed_item_profit FROM item_profit) AS costed_item_profit,
      (SELECT cost_pending_orders FROM item_profit) AS cost_pending_orders,
      (SELECT total_other_costs FROM other_costs) AS total_other_costs,
      (SELECT returns_value FROM returns_agg) AS returns_value,
      (SELECT returns_count FROM returns_agg) AS returns_count,
      (SELECT new_customers FROM customers_agg) AS new_customers,
      (SELECT pending_orders FROM pending_agg) AS pending_orders
  `;

  const res = await query(sql, [startDate, endDate]);
  const row = res.rows[0] || {};
  const totalSales = roundMoney(row.total_sales);
  const returnsValue = roundMoney(row.returns_value);
  const netSales = roundMoney(totalSales - returnsValue);
  const totalOrders = Number(row.delivered_orders || 0);
  const costedItemProfit = Number(row.costed_item_profit || 0);
  const totalOtherCosts = Number(row.total_other_costs || 0);
  const netProfit = roundMoney(costedItemProfit - totalOtherCosts);
  const costPendingOrders = Number(row.cost_pending_orders || 0);
  const averageOrderValue = totalOrders > 0 ? roundMoney(totalSales / totalOrders) : 0;
  const returnRate = totalSales > 0 ? Number(((returnsValue / totalSales) * 100).toFixed(2)) : 0;

  return {
    totalSales,
    netSales,
    netProfit,
    costPendingOrders,
    isProfitIncomplete: costPendingOrders > 0,
    totalOrders,
    averageOrderValue,
    returnsValue,
    returnsCount: Number(row.returns_count || 0),
    returnRate,
    newCustomers: Number(row.new_customers || 0),
    pendingOrders: Number(row.pending_orders || 0),
  };
}

class SuperadminDashboardService {
  /**
   * Top-of-page fast summary: attention strip, KPIs (with comparison deltas), team panel, security panel
   */
  async getSummary({ from, to, preset, compare = "previous" } = {}) {
    const range = resolveDateRange({ from, to, preset });
    const compareEnabled = compare !== "none" && compare !== "false";
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
    const accessDeniedFrom = windowStart.toISOString();
    const accessDeniedTo = windowEnd.toISOString();

    const [currentKpis, previousKpis, attentionRes, teamSummaryRes, teamPreviewRes, failedLoginsRes, recentLoginsRes, permChangesRes] =
      await Promise.all([
        fetchPeriodKpis(range.from, range.to),
        compareEnabled ? fetchPeriodKpis(range.prevFrom, range.prevTo) : Promise.resolve(null),
        query(
          `
          SELECT
            (SELECT COUNT(*)::int FROM users WHERE role::text = 'ADMIN' AND status = 'INVITED') AS pending_invites,
            (
              SELECT COUNT(DISTINCT u.id)::int
              FROM users u
              JOIN LATERAL (
                SELECT expires_at, used_at FROM admin_invites
                WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
              ) ai ON true
              WHERE u.role::text = 'ADMIN' AND u.status = 'INVITED'
                AND ai.used_at IS NULL AND ai.expires_at < NOW()
            ) AS expired_invites,
            (
              SELECT COUNT(DISTINCT o.id)::int
              FROM orders o
              JOIN order_items oi ON oi.order_id = o.id
              WHERE LOWER(COALESCE(o.order_status, o.status, '')) <> 'cancelled'
                AND oi.cost_price IS NULL
            ) AS orders_cost_pending,
            (
              SELECT COUNT(*)::int
              FROM sales_returns
              WHERE status = 'REQUESTED'
            ) AS returns_waiting_approval,
            (
              SELECT COUNT(*)::int
              FROM payment_refunds
              WHERE status = 'FAILED'
            ) AS refunds_failed,
            (
              SELECT COUNT(*)::int
              FROM audit_logs
              WHERE action = 'LOGIN_FAILED'
                AND created_at >= $1::timestamptz
                AND created_at <= $2::timestamptz
            ) AS failed_logins_24h,
            (
              SELECT COUNT(*)::int
              FROM audit_logs
              WHERE action = 'ACCESS_DENIED'
                AND created_at >= $1::timestamptz
                AND created_at <= $2::timestamptz
            ) AS access_denied_24h
        `,
          [accessDeniedFrom, accessDeniedTo]
        ),
        query(`
          SELECT
            COUNT(*) FILTER (WHERE role::text = 'ADMIN')::int AS total_admins,
            COUNT(*) FILTER (WHERE role::text = 'ADMIN' AND status = 'ACTIVE')::int AS active_admins,
            COUNT(*) FILTER (WHERE role::text = 'ADMIN' AND status = 'INVITED')::int AS invited_admins,
            COUNT(*) FILTER (WHERE role::text = 'ADMIN' AND status = 'DISABLED')::int AS disabled_admins,
            COUNT(*) FILTER (WHERE role::text = 'SUPERADMIN' AND status = 'ACTIVE')::int AS active_superadmins
          FROM users
        `),
        query(
          `
          WITH bounds AS (
            SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                   (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts,
                   (date_trunc('day', NOW() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka') AS dhaka_today_start
          )
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.status,
            u.last_login_at,
            (
              SELECT COUNT(*)::int
              FROM audit_logs al, bounds b
              WHERE al.actor_id = u.id
                AND al.created_at >= b.dhaka_today_start
            ) AS actions_today,
            (
              SELECT COUNT(DISTINCT al.entity_id)::int
              FROM audit_logs al, bounds b
              WHERE al.actor_id = u.id
                AND al.entity_type = 'ORDER'
                AND al.action IN ('ORDER_STATUS_CHANGED', 'ORDER_UPDATED')
                AND al.created_at >= b.start_ts AND al.created_at < b.end_ts
            ) AS orders_handled,
            (
              SELECT COUNT(DISTINCT sr_al.entity_id)::int
              FROM audit_logs sr_al, bounds b
              WHERE sr_al.actor_id = u.id
                AND sr_al.action LIKE 'RETURN_%'
                AND sr_al.created_at >= b.start_ts AND sr_al.created_at < b.end_ts
            ) AS returns_processed,
            (
              SELECT COUNT(*)::int
              FROM order_items oi, bounds b
              WHERE oi.cost_entered_by = u.id
                AND oi.cost_entered_at >= b.start_ts AND oi.cost_entered_at < b.end_ts
            ) AS costs_entered,
            COALESCE(
              json_agg(DISTINCT p.key) FILTER (WHERE p.key IS NOT NULL),
              '[]'::json
            ) AS permissions
          FROM users u
          LEFT JOIN admin_permissions ap ON ap.user_id = u.id
          LEFT JOIN permissions p ON p.id = ap.permission_id
          WHERE u.role::text = 'ADMIN'
          GROUP BY u.id
          ORDER BY
            CASE u.status WHEN 'ACTIVE' THEN 1 WHEN 'INVITED' THEN 2 ELSE 3 END,
            u.last_login_at DESC NULLS LAST,
            u.created_at DESC
          LIMIT 8
        `,
          [range.from, range.to]
        ),
        query(`
          SELECT COUNT(*)::int AS count
          FROM audit_logs
          WHERE action = 'LOGIN_FAILED'
            AND created_at >= NOW() - INTERVAL '24 hours'
        `),
        query(`
          SELECT al.id, al.actor_id, al.actor_type, al.ip_address, al.user_agent, al.created_at,
                 u.name AS actor_name, u.email AS actor_email
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.actor_id
          WHERE al.action = 'LOGIN_SUCCEEDED'
            AND al.actor_type IN ('ADMIN', 'SUPERADMIN')
          ORDER BY al.created_at DESC
          LIMIT 8
        `),
        query(`
          SELECT al.id, al.actor_id, al.actor_type, al.action, al.entity_id, al.new_values, al.metadata, al.created_at,
                 actor_u.name AS actor_name, actor_u.email AS actor_email,
                 target_u.name AS target_name, target_u.email AS target_email
          FROM audit_logs al
          LEFT JOIN users actor_u ON actor_u.id = al.actor_id
          LEFT JOIN users target_u ON target_u.id::text = al.entity_id
          WHERE al.action IN ('ADMIN_PERMISSIONS_UPDATED', 'ADMIN_STATUS_CHANGED', 'ADMIN_INVITE_SENT')
          ORDER BY al.created_at DESC
          LIMIT 8
        `),
      ]);

    const att = attentionRes.rows[0] || {};
    const teamSum = teamSummaryRes.rows[0] || {};

    return {
      range: {
        from: range.from,
        to: range.to,
        prevFrom: compareEnabled ? range.prevFrom : null,
        prevTo: compareEnabled ? range.prevTo : null,
        spanDays: range.spanDays,
        bucket: range.bucket,
        compare: compareEnabled,
      },
      attention: {
        pendingInvites: Number(att.pending_invites || 0),
        expiredInvites: Number(att.expired_invites || 0),
        ordersCostPending: Number(att.orders_cost_pending || 0),
        returnsWaitingApproval: Number(att.returns_waiting_approval || 0),
        refundsFailed: Number(att.refunds_failed || 0),
        failedLogins24h: Number(att.failed_logins_24h || 0),
        accessDenied24h: Number(att.access_denied_24h || 0),
        // Spec-aligned snake_case fields & synchronized 24h window bounds
        cost_pending_orders: Number(att.orders_cost_pending || 0),
        returns_waiting: Number(att.returns_waiting_approval || 0),
        access_denied_24h: Number(att.access_denied_24h || 0),
        accessDeniedWindow: {
          from: accessDeniedFrom,
          to: accessDeniedTo,
        },
      },
      kpis: {
        totalSales: {
          value: currentKpis.totalSales,
          previousValue: previousKpis ? previousKpis.totalSales : null,
          changePercent: calcDelta(currentKpis.totalSales, previousKpis?.totalSales, compareEnabled),
        },
        netSales: {
          value: currentKpis.netSales,
          previousValue: previousKpis ? previousKpis.netSales : null,
          changePercent: calcDelta(currentKpis.netSales, previousKpis?.netSales, compareEnabled),
        },
        netProfit: {
          value: currentKpis.netProfit,
          previousValue: previousKpis ? previousKpis.netProfit : null,
          changePercent: calcDelta(currentKpis.netProfit, previousKpis?.netProfit, compareEnabled),
          costPendingOrders: currentKpis.costPendingOrders,
          isProfitIncomplete: currentKpis.isProfitIncomplete,
        },
        totalOrders: {
          value: currentKpis.totalOrders,
          previousValue: previousKpis ? previousKpis.totalOrders : null,
          changePercent: calcDelta(currentKpis.totalOrders, previousKpis?.totalOrders, compareEnabled),
        },
        averageOrderValue: {
          value: currentKpis.averageOrderValue,
          previousValue: previousKpis ? previousKpis.averageOrderValue : null,
          changePercent: calcDelta(currentKpis.averageOrderValue, previousKpis?.averageOrderValue, compareEnabled),
        },
        returnRate: {
          value: currentKpis.returnRate,
          returnsValue: currentKpis.returnsValue,
          returnsCount: currentKpis.returnsCount,
          previousValue: previousKpis ? previousKpis.returnRate : null,
          changePercent: calcDelta(currentKpis.returnRate, previousKpis?.returnRate, compareEnabled),
        },
        newCustomers: {
          value: currentKpis.newCustomers,
          previousValue: previousKpis ? previousKpis.newCustomers : null,
          changePercent: calcDelta(currentKpis.newCustomers, previousKpis?.newCustomers, compareEnabled),
        },
        pendingOrders: {
          value: currentKpis.pendingOrders,
          previousValue: previousKpis ? previousKpis.pendingOrders : null,
          changePercent: calcDelta(currentKpis.pendingOrders, previousKpis?.pendingOrders, compareEnabled),
        },
      },
      team: {
        summary: {
          total: Number(teamSum.total_admins || 0),
          active: Number(teamSum.active_admins || 0),
          invited: Number(teamSum.invited_admins || 0),
          disabled: Number(teamSum.disabled_admins || 0),
          activeSuperadmins: Number(teamSum.active_superadmins || 0),
        },
        admins: teamPreviewRes.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          lastLoginAt: row.last_login_at,
          actionsToday: Number(row.actions_today || 0),
          ordersHandled: Number(row.orders_handled || 0),
          returnsProcessed: Number(row.returns_processed || 0),
          costsEntered: Number(row.costs_entered || 0),
          permissions: Array.isArray(row.permissions) ? row.permissions : [],
        })),
      },
      security: {
        failedLogins24h: Number(failedLoginsRes.rows[0]?.count || 0),
        recentLogins: recentLoginsRes.rows.map((row) => ({
          id: row.id,
          actorId: row.actor_id,
          actorName: row.actor_name || row.actor_email || "Administrator",
          actorEmail: row.actor_email,
          actorRole: row.actor_type,
          device: parseUserAgent(row.user_agent),
          ipAddress: row.ip_address || "Unknown IP",
          createdAt: row.created_at,
        })),
        recentPermissionChanges: permChangesRes.rows.map((row) => ({
          id: row.id,
          action: row.action,
          actorName: row.actor_name || row.actor_email || "Super Admin",
          targetName: row.target_name || row.target_email || row.metadata?.email || (row.entity_id ? `#${String(row.entity_id).slice(0, 8)}` : "Admin"),
          newValues: row.new_values,
          createdAt: row.created_at,
        })),
      },
    };
  }

  /**
   * Progressive Charts Endpoint (3-minute in-memory TTL cache)
   */
  async getCharts({ from, to, preset, refresh = false } = {}) {
    const range = resolveDateRange({ from, to, preset });
    const cacheKey = `${range.from}:${range.to}`;
    const cached = chartsCache.get(cacheKey);
    if (!refresh && cached && Date.now() - cached.timestamp < CHARTS_CACHE_TTL_MS) {
      return cached.data;
    }

    const truncUnit = range.bucket; // 'hour' | 'day' | 'week' | 'month'
    const stepInterval = range.step;

    const [
      trendRes,
      brandRes,
      collectionRes,
      statusRes,
      returnReasonRes,
      topProductsRes,
      topCustomersRes,
    ] = await Promise.all([
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        ),
        series AS (
          SELECT generate_series(
            date_trunc('${truncUnit}', (SELECT start_ts FROM bounds) AT TIME ZONE 'Asia/Dhaka'),
            date_trunc('${truncUnit}', ((SELECT end_ts FROM bounds) - INTERVAL '1 second') AT TIME ZONE 'Asia/Dhaka'),
            INTERVAL '${stepInterval}'
          ) AS dhaka_bucket
        ),
        order_profits AS (
          SELECT
            o.id,
            date_trunc('${truncUnit}', o.delivered_at AT TIME ZONE 'Asia/Dhaka') AS dhaka_bucket,
            o.total_amount,
            COALESCE(SUM(CASE WHEN oi.cost_price IS NOT NULL THEN oi.line_total - (oi.cost_price * oi.quantity) ELSE 0 END), 0)
              - COALESCE((SELECT SUM(ooc.amount) FROM order_other_costs ooc WHERE ooc.order_id = o.id), 0) AS net_profit,
            BOOL_OR(oi.cost_price IS NULL) AS has_cost_pending
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          CROSS JOIN bounds b
          WHERE o.order_status = 'DELIVERED'
            AND o.delivered_at >= b.start_ts
            AND o.delivered_at < b.end_ts
          GROUP BY o.id, o.delivered_at, o.total_amount
        )
        SELECT
          (s.dhaka_bucket AT TIME ZONE 'Asia/Dhaka') AS period,
          COALESCE(SUM(op.total_amount), 0) AS sales,
          COALESCE(SUM(op.net_profit), 0) AS net_profit,
          COUNT(op.id)::int AS order_count,
          COUNT(*) FILTER (WHERE op.has_cost_pending)::int AS cost_pending_count
        FROM series s
        LEFT JOIN order_profits op ON op.dhaka_bucket = s.dhaka_bucket
        GROUP BY s.dhaka_bucket
        ORDER BY s.dhaka_bucket ASC
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          COALESCE(b.name, 'Unbranded') AS name,
          SUM(oi.quantity)::int AS units_sold,
          SUM(oi.line_total)::numeric AS sales
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN brands b ON b.id = p.brand_id
        CROSS JOIN bounds bnd
        WHERE o.order_status = 'DELIVERED'
          AND o.delivered_at >= bnd.start_ts
          AND o.delivered_at < bnd.end_ts
        GROUP BY COALESCE(b.name, 'Unbranded')
        ORDER BY SUM(oi.line_total) DESC
        LIMIT 8
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          c.name,
          SUM(oi.quantity)::int AS units_sold,
          SUM(oi.line_total)::numeric AS sales
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN product_collections pc ON pc.product_id = oi.product_id
        JOIN collections c ON c.id = pc.collection_id
        CROSS JOIN bounds bnd
        WHERE o.order_status = 'DELIVERED'
          AND o.delivered_at >= bnd.start_ts
          AND o.delivered_at < bnd.end_ts
        GROUP BY c.id, c.name
        ORDER BY SUM(oi.line_total) DESC
        LIMIT 8
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          UPPER(COALESCE(o.order_status, o.status, 'PENDING')) AS status,
          COUNT(*)::int AS count,
          COALESCE(SUM(o.total_amount), 0)::numeric AS amount
        FROM orders o, bounds bnd
        WHERE o.created_at >= bnd.start_ts
          AND o.created_at < bnd.end_ts
        GROUP BY UPPER(COALESCE(o.order_status, o.status, 'PENDING'))
        ORDER BY COUNT(*) DESC
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          sr.reason,
          COUNT(*)::int AS count,
          COALESCE(SUM(sr.refund_amount), 0)::numeric AS refund_amount
        FROM sales_returns sr, bounds bnd
        WHERE COALESCE(sr.requested_at, sr.created_at) >= bnd.start_ts
          AND COALESCE(sr.requested_at, sr.created_at) < bnd.end_ts
        GROUP BY sr.reason
        ORDER BY COUNT(*) DESC
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          oi.product_id,
          COALESCE(p.name, oi.product_name) AS name,
          COALESCE(b.name, 'Unbranded') AS brand_name,
          SUM(oi.quantity)::int AS units_sold,
          SUM(oi.line_total)::numeric AS sales_amount,
          pi.image_url
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
        CROSS JOIN bounds bnd
        WHERE o.order_status = 'DELIVERED'
          AND o.delivered_at >= bnd.start_ts
          AND o.delivered_at < bnd.end_ts
        GROUP BY oi.product_id, COALESCE(p.name, oi.product_name), COALESCE(b.name, 'Unbranded'), pi.image_url
        ORDER BY SUM(oi.line_total) DESC, SUM(oi.quantity) DESC
        LIMIT 5
      `,
        [range.from, range.to]
      ),
      query(
        `
        WITH bounds AS (
          SELECT ($1::date::timestamp AT TIME ZONE 'Asia/Dhaka') AS start_ts,
                 (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka') AS end_ts
        )
        SELECT
          u.id,
          COALESCE(u.name, 'Guest Customer') AS name,
          u.email,
          COUNT(o.id)::int AS order_count,
          COALESCE(SUM(o.total_amount), 0)::numeric AS total_spent
        FROM orders o
        JOIN users u ON u.id = o.user_id
        CROSS JOIN bounds bnd
        WHERE o.order_status = 'DELIVERED'
          AND o.delivered_at >= bnd.start_ts
          AND o.delivered_at < bnd.end_ts
        GROUP BY u.id, u.name, u.email
        ORDER BY SUM(o.total_amount) DESC, COUNT(o.id) DESC
        LIMIT 5
      `,
        [range.from, range.to]
      ),
    ]);

    const data = {
      range: { from: range.from, to: range.to, bucket: range.bucket },
      salesProfitTrend: trendRes.rows.map((r) => ({
        period: r.period,
        sales: roundMoney(r.sales),
        netProfit: roundMoney(r.net_profit),
        orderCount: Number(r.order_count || 0),
        costPendingCount: Number(r.cost_pending_count || 0),
      })),
      salesByBrand: brandRes.rows.map((r) => ({
        name: r.name,
        unitsSold: Number(r.units_sold || 0),
        sales: roundMoney(r.sales),
      })),
      topCollections: {
        overlapNote: "Products may belong to multiple collections, so collection totals can overlap.",
        items: collectionRes.rows.map((r) => ({
          name: r.name,
          unitsSold: Number(r.units_sold || 0),
          sales: roundMoney(r.sales),
        })),
      },
      orderStatusBreakdown: statusRes.rows.map((r) => ({
        status: r.status,
        count: Number(r.count || 0),
        amount: roundMoney(r.amount),
      })),
      returnsByReason: returnReasonRes.rows.map((r) => ({
        reason: r.reason,
        count: Number(r.count || 0),
        refundAmount: roundMoney(r.refund_amount),
      })),
      topProducts: topProductsRes.rows.map((r) => ({
        productId: r.product_id,
        name: r.name,
        brandName: r.brand_name,
        unitsSold: Number(r.units_sold || 0),
        salesAmount: roundMoney(r.sales_amount),
        imageUrl: r.image_url,
      })),
      topCustomers: topCustomersRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        orderCount: Number(r.order_count || 0),
        totalSpent: roundMoney(r.total_spent),
      })),
    };

    chartsCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Filterable, paginated Recent Activity Feed from audit_logs
   */
  async getActivity({ page = 1, limit = 15, actorId = "", action = "" } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (safePage - 1) * safeLimit;

    const conditions = [];
    const values = [];

    if (actorId) {
      if (!UUID_RE.test(String(actorId))) {
        const err = new Error("Actor ID must be a valid UUID.");
        err.statusCode = 400;
        throw err;
      }
      values.push(String(actorId));
      conditions.push(`al.actor_id = $${values.length}`);
    }

    if (action) {
      values.push(String(action).trim().toUpperCase());
      conditions.push(`al.action = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRes, rowsRes, actorsRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM audit_logs al ${whereClause}`, values),
      query(
        `
        SELECT
          al.id,
          al.actor_id,
          al.actor_type,
          al.action,
          al.entity_type,
          al.entity_id,
          al.metadata,
          al.created_at,
          u.name AS actor_name,
          u.email AS actor_email
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.actor_id
        ${whereClause}
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
        [...values, safeLimit, offset]
      ),
      query(`
        SELECT id, name, email, role
        FROM users
        WHERE role::text IN ('ADMIN', 'SUPERADMIN')
        ORDER BY CASE WHEN role = 'SUPERADMIN' THEN 1 ELSE 2 END, name ASC NULLS LAST
      `),
    ]);

    const total = countRes.rows[0]?.total || 0;

    return {
      items: rowsRes.rows.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actorType: row.actor_type,
        actorName: row.actor_name || row.actor_email || row.actor_type,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        message: formatActivityMessage(row),
        createdAt: row.created_at,
      })),
      actors: actorsRes.rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }
}

module.exports = new SuperadminDashboardService();

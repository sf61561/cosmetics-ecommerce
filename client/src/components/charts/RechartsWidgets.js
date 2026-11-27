"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAdminTheme } from "@/context/AdminThemeContext";

export function formatMoney2(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoneyCompact(value) {
  const num = Number(value || 0);
  if (Math.abs(num) >= 1000000) return `৳${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `৳${(num / 1000).toFixed(1)}k`;
  return `৳${num.toFixed(0)}`;
}

const STATUS_COLORS = {
  DELIVERED: "#10B981",
  SHIPPED: "#06B6D4",
  PROCESSING: "#8B5CF6",
  CONFIRMED: "#3B82F6",
  PENDING: "#F59E0B",
  PLACED: "#EC4899",
  CANCELLED: "#EF4444",
  RETURNED: "#6B7280",
};

const FALLBACK_PIE_COLORS = [
  "#14B8A6",
  "#F97316",
  "#A855F7",
  "#84CC16",
  "#E11D48",
  "#0EA5E9",
  "#D97706",
  "#6366F1",
];

function getStatusColorMap(items = []) {
  const used = new Set();
  const colorMap = {};

  for (const item of items) {
    const key = String(item.status || "").toUpperCase();
    const preferred = STATUS_COLORS[key];
    if (preferred && !used.has(preferred)) {
      used.add(preferred);
      colorMap[item.status] = preferred;
    }
  }

  let fallbackIdx = 0;
  for (const item of items) {
    if (colorMap[item.status]) continue;
    let candidate = FALLBACK_PIE_COLORS[fallbackIdx % FALLBACK_PIE_COLORS.length];
    while (used.has(candidate) && fallbackIdx < FALLBACK_PIE_COLORS.length * 2) {
      fallbackIdx += 1;
      candidate = FALLBACK_PIE_COLORS[fallbackIdx % FALLBACK_PIE_COLORS.length];
    }
    fallbackIdx += 1;
    used.add(candidate);
    colorMap[item.status] = candidate;
  }

  return colorMap;
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 shadow-xl text-xs">
      {label && (
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || "#8B5CF6" }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatter ? formatter(entry.value, entry) : formatMoney2(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Store Admin Overview Recharts Bar Chart
 */
export function AdminSalesBarChart({ sales = [], formatLabel, formatDescription }) {
  const { isDark } = useAdminTheme();
  const hasSales = sales.some((s) => Number(s.revenue || 0) > 0);
  const chartData = sales.map((item) => ({
    ...item,
    label: formatLabel ? formatLabel(item.period) : String(item.period),
    fullLabel: formatDescription ? formatDescription(item.period) : String(item.period),
  }));

  const gridStroke = isDark ? "#1F2937" : "#F3F4F6";
  const tickColor = isDark ? "#9CA3AF" : "#6B7280";

  return (
    <div>
      {!hasSales && (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          No delivered sales in this period. Each time bucket is shown as zero.
        </p>
      )}
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatMoneyCompact}
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload;
                return (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 shadow-xl text-xs">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {row?.fullLabel}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Revenue: <span className="font-semibold">{formatMoney2(row?.revenue)}</span>
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      Delivered orders: <span className="font-semibold">{row?.orderCount || 0}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="revenue" name="Delivered Sales" fill="#9B4F5E" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Super Admin Sales & Net Profit Trend Chart (Recharts LineChart)
 */
export function SalesProfitTrendChart({ data = [], bucket = "day" }) {
  const { isDark } = useAdminTheme();
  const gridStroke = isDark ? "#1F2937" : "#F3F4F6";
  const tickColor = isDark ? "#9CA3AF" : "#6B7280";

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-gray-400">
        No delivered order trend data for the selected date range.
      </div>
    );
  }

  const formatted = data.map((row) => {
    const dt = new Date(row.period);
    const label =
      bucket === "hour"
        ? dt.toLocaleTimeString("en-BD", { hour: "numeric", hour12: true, timeZone: "Asia/Dhaka" })
        : bucket === "month"
        ? dt.toLocaleDateString("en-BD", { month: "short", year: "2-digit", timeZone: "Asia/Dhaka" })
        : dt.toLocaleDateString("en-BD", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
    return { ...row, label };
  });

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={formatted} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={{ stroke: gridStroke }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatMoneyCompact}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={58}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
          <Line
            type="monotone"
            dataKey="sales"
            name="Delivered Sales"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="netProfit"
            name="Net Profit"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Recharts Bar Chart for Brands / Collections
 */
export function HorizontalSalesBarChart({ items = [], color = "#8B5CF6", emptyMessage = "No sales data in this period." }) {
  const { isDark } = useAdminTheme();
  const gridStroke = isDark ? "#1F2937" : "#F3F4F6";
  const tickColor = isDark ? "#9CA3AF" : "#6B7280";

  if (!items.length) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={items} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatMoneyCompact}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 14)}…` : v)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-xl text-xs">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{row?.name}</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-0.5">
                    Sales: <span className="font-semibold">{formatMoney2(row?.sales)}</span>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Units sold: <span className="font-semibold">{row?.unitsSold || 0}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="sales" name="Sales" fill={color} radius={[0, 6, 6, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Recharts Donut Chart for Order Status Breakdown
 */
export function OrderStatusDonutChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-gray-400">
        No orders placed during this date range.
      </div>
    );
  }

  const colorMap = getStatusColorMap(data);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="h-56 w-full sm:w-56 shrink-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={colorMap[entry.status]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload;
                return (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-xl text-xs">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{row?.status}</p>
                    <p className="text-gray-600 dark:text-gray-300">Orders: {row?.count}</p>
                    <p className="text-gray-500 dark:text-gray-400">Total: {formatMoney2(row?.amount)}</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full flex flex-col gap-2 text-xs min-w-0">
        {data.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3.5 py-2"
          >
            <span className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colorMap[item.status] }}
              />
              <span className="font-medium whitespace-nowrap">{item.status}</span>
            </span>
            <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Recharts Bar Chart for Returns by Reason
 */
export function ReturnsReasonBarChart({ data = [] }) {
  const { isDark } = useAdminTheme();
  const gridStroke = isDark ? "#1F2937" : "#F3F4F6";
  const tickColor = isDark ? "#9CA3AF" : "#6B7280";

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-gray-400">
        No return requests recorded during this period.
      </div>
    );
  }

  const labels = {
    DEFECTIVE_DAMAGED: "Defective",
    WRONG_ITEM: "Wrong Item",
    NOT_AS_DESCRIBED: "Not Described",
    SIZE_FIT_ISSUE: "Size / Fit",
    CHANGED_MIND: "Changed Mind",
    LATE_DELIVERY: "Late Delivery",
  };

  const formatted = data.map((row) => ({
    ...row,
    label: labels[row.reason] || row.reason,
  }));

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={formatted} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={{ stroke: gridStroke }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-xl text-xs">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{row?.label}</p>
                  <p className="text-gray-600 dark:text-gray-300">Requests: {row?.count}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Refund amount: {formatMoney2(row?.refundAmount)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" name="Return Requests" fill="#EC4899" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

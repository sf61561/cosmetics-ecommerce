"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaArrowRight,
  FaBoxOpen,
  FaChartLine,
  FaClipboardList,
  FaExclamationTriangle,
  FaUsers,
} from "react-icons/fa";
import { getDashboardOverview } from "@/services/dashboardService";

const DHAKA_TIME_ZONE = "Asia/Dhaka";
const RANGE_LABELS = { today: "Today", "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" };
const money = (value) => `\u09F3${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const date = (value) => new Date(value).toLocaleDateString("en-BD", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: DHAKA_TIME_ZONE,
});

function MetricCard({ label, value, icon: Icon, tone, detail, detailTone = "text-gray-500 dark:text-gray-400" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {detail && <p className={`mt-1 text-xs ${detailTone}`}>{detail}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon /></span>
      </div>
    </div>
  );
}

function getBucketLabel(period, range) {
  const bucketDate = new Date(period);
  if (range === "today") {
    return bucketDate.toLocaleTimeString("en-BD", {
      hour: "numeric",
      hour12: true,
      timeZone: DHAKA_TIME_ZONE,
    });
  }

  const dateLabel = bucketDate.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    timeZone: DHAKA_TIME_ZONE,
  });
  return dateLabel;
}

function getBucketDescription(period, range) {
  const bucketDate = new Date(period);
  if (range === "today") {
    return bucketDate.toLocaleString("en-BD", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      timeZone: DHAKA_TIME_ZONE,
    });
  }
  if (range === "90") return `Week starting ${date(bucketDate)}`;
  return bucketDate.toLocaleDateString("en-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DHAKA_TIME_ZONE,
  });
}

function SalesChart({ sales, range }) {
  const max = Math.max(...sales.map((item) => item.revenue), 1);
  const hasSales = sales.some((item) => item.revenue > 0);
  const widthClass = range === "30" ? "min-w-[900px]" : range === "today" ? "min-w-[760px]" : "min-w-[560px]";
  const labelInterval = range === "today" || range === "30" ? 3 : range === "90" ? 2 : 1;

  return (
    <div>
      {!hasSales && <p className="mb-3 text-xs text-gray-500">No delivered sales in this period. Each time bucket is shown as zero.</p>}
      <div className="overflow-x-auto" aria-label={`${RANGE_LABELS[range]} delivered sales chart`}>
        <div className={`flex h-60 items-end gap-2 border-b border-l border-gray-200 px-3 dark:border-gray-700 ${widthClass}`}>
          {sales.map((item, index) => {
            const label = getBucketLabel(item.period, range);
            const description = getBucketDescription(item.period, range);
            const showLabel = index % labelInterval === 0 || index === sales.length - 1;
            const barHeight = item.revenue ? Math.max((item.revenue / max) * 78, 4) : 1;

            return (
              <div key={String(item.period)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="max-w-full truncate text-[10px] text-gray-500" title={`${description}: ${money(item.revenue)}`}>
                  {item.revenue ? money(item.revenue) : "\u00A0"}
                </span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-[#9B4F5E] transition-all"
                  style={{ height: `${barHeight}%` }}
                  title={`${description} · ${money(item.revenue)} · ${item.orderCount} delivered orders`}
                  role="img"
                  aria-label={`${description}: ${money(item.revenue)}, ${item.orderCount} delivered orders`}
                />
                <span className="h-4 whitespace-nowrap text-[10px] text-gray-500" title={description}>
                  {showLabel ? label : "\u00A0"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getSalesComparison(metrics) {
  if (metrics.salesChangePercent === null || metrics.salesChangePercent === undefined) {
    if (metrics.totalSales > 0) {
      return { label: "New sales vs previous period", tone: "text-emerald-700 dark:text-emerald-300" };
    }
    return { label: "No sales in either period", tone: "text-gray-500 dark:text-gray-400" };
  }

  const change = Number(metrics.salesChangePercent);
  const prefix = change > 0 ? "+" : "";
  const tone = change > 0
    ? "text-emerald-700 dark:text-emerald-300"
    : change < 0
      ? "text-red-700 dark:text-red-300"
      : "text-gray-500 dark:text-gray-400";
  return { label: `${prefix}${change.toFixed(1)}% vs previous period`, tone };
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    getDashboardOverview(range)
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [range]);

  const metrics = data?.metrics;
  const salesComparison = metrics ? getSalesComparison(metrics) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Overview</p>
          <h1 className="mt-1 text-2xl font-bold">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor delivered sales and daily store operations.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Reporting period
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {!data && !error && <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Loading dashboard data...</div>}

      {data && (
        <>
          <section aria-label="Sales metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Delivered sales"
              value={money(metrics.totalSales)}
              detail={salesComparison.label}
              detailTone={salesComparison.tone}
              icon={FaChartLine}
              tone="bg-pink-50 text-[#9B4F5E] dark:bg-[#3b2430] dark:text-[#e5a9b5]"
            />
            <MetricCard
              label="Delivered orders"
              value={metrics.deliveredOrders}
              detail={RANGE_LABELS[range]}
              icon={FaClipboardList}
              tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
            />
            <MetricCard
              label="Average order value"
              value={money(metrics.averageOrderValue)}
              detail="Delivered sales ÷ delivered orders"
              icon={FaChartLine}
              tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
            />
          </section>

          <section aria-label="Operational metrics" className="space-y-3">
            <div>
              <h2 className="font-semibold">Store operations</h2>
              <p className="text-xs text-gray-500">Orders and new customers use the selected period; product and stock counts are current.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Orders placed" value={metrics.totalOrders} detail={RANGE_LABELS[range]} icon={FaClipboardList} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" />
              <MetricCard label="New customers" value={metrics.totalCustomers} detail={RANGE_LABELS[range]} icon={FaUsers} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300" />
              <MetricCard label="Active products" value={metrics.activeProducts} detail="Current catalog" icon={FaBoxOpen} tone="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300" />
              <MetricCard label="Pending orders" value={metrics.pendingOrders} detail="Placed in selected period" icon={FaClipboardList} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" />
              <MetricCard label="Low stock" value={metrics.lowStockProducts} detail="Current inventory" icon={FaExclamationTriangle} tone="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5">
                <h2 className="font-semibold">Sales overview</h2>
                <p className="text-xs text-gray-500">
                  Delivered orders · grouped by delivery date · {RANGE_LABELS[range]}
                </p>
              </div>
              <SalesChart sales={data.sales} range={range} />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Inventory alerts</h2>
                <Link href="/admin/products" className="text-xs font-semibold text-[#9B4F5E]">View all</Link>
              </div>
              {data.inventoryAlerts.length ? (
                <div className="space-y-3">
                  {data.inventoryAlerts.slice(0, 5).map((item) => (
                    <Link href={`/admin/products/${item.id}`} key={item.id} className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-red-600">{item.stockQuantity} left</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <p className="py-8 text-center text-sm text-gray-500">No low-stock products.</p>}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Recent orders</h2>
                <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B4F5E]">View all <FaArrowRight /></Link>
              </div>
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-semibold">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.customerName} · {date(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(order.totalAmount)}</p>
                      <p className="text-xs text-gray-500">{order.orderStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4">
                <h2 className="font-semibold">Top-selling products</h2>
                <p className="text-xs text-gray-500">Delivered orders in the selected period.</p>
              </div>
              {data.topProducts.length ? (
                <div className="space-y-3">
                  {data.topProducts.map((product) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                        {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.brandName || "Unbranded"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{product.unitsSold} sold</p>
                        <p className="text-xs text-gray-500">{money(product.salesAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="py-8 text-center text-sm text-gray-500">No delivered sales in this period.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

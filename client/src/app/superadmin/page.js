"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import superadminService from "@/services/superadminService";
import DashboardHeader, {
  getTodayDhaka,
  getPresetDateRange,
  matchPresetForDates,
  validateCustomRange,
} from "@/components/superadmin/dashboard/DashboardHeader";
import NeedsAttentionStrip from "@/components/superadmin/dashboard/NeedsAttentionStrip";
import BusinessKpiGrid from "@/components/superadmin/dashboard/BusinessKpiGrid";
import TeamSecurityPanels from "@/components/superadmin/dashboard/TeamSecurityPanels";
import RecentActivityFeed from "@/components/superadmin/dashboard/RecentActivityFeed";
import {
  SalesProfitTrendChart,
  HorizontalSalesBarChart,
  OrderStatusDonutChart,
  ReturnsReasonBarChart,
  formatMoney2,
} from "@/components/charts/RechartsWidgets";
import InviteAdminModal from "@/components/admin/admins/InviteAdminModal";
import EditPermissionsModal from "@/components/admin/admins/EditPermissionsModal";
import { IoInformationCircleOutline } from "react-icons/io5";

function getInitialDashboardState(searchParams) {
  const todayStr = getTodayDhaka();
  const defaultBounds = getPresetDateRange("month", todayStr);
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");
  const urlCompare = searchParams.get("compare");

  const hasValidRange = urlFrom && urlTo && validateCustomRange(urlFrom, urlTo) === "";
  const activeRange = hasValidRange ? { from: urlFrom, to: urlTo } : defaultBounds;
  const preset = hasValidRange ? matchPresetForDates(urlFrom, urlTo, todayStr) : "month";
  const compare = !(urlCompare === "none" || urlCompare === "false");

  return { todayStr, activeRange, preset, compare };
}

function SuperadminDashboardContent() {
  const searchParams = useSearchParams();
  const [initialState] = useState(() => getInitialDashboardState(searchParams));

  const [preset, setPreset] = useState(initialState.preset);
  const [activeRange, setActiveRange] = useState(initialState.activeRange);
  const [customFrom, setCustomFrom] = useState(initialState.activeRange.from);
  const [customTo, setCustomTo] = useState(initialState.activeRange.to);
  const [customError, setCustomError] = useState("");
  const [compare, setCompare] = useState(initialState.compare);

  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [charts, setCharts] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [chartsError, setChartsError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTargetAdmin, setEditTargetAdmin] = useState(null);
  const [toast, setToast] = useState("");

  // Keep URL query synchronized with active filter controls
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("from", activeRange.from);
    params.set("to", activeRange.to);
    params.set("compare", compare ? "previous" : "none");
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeRange.from, activeRange.to, compare]);

  const loadSummary = useCallback(() => {
    return superadminService
      .getDashboardSummary({
        from: activeRange.from,
        to: activeRange.to,
        compare: compare ? "previous" : "none",
      })
      .then((res) => {
        setSummary(res?.data || null);
        setSummaryError("");
        setLastUpdatedAt(new Date());
      })
      .catch((err) => {
        setSummaryError(err.message || "Failed to load dashboard summary.");
      })
      .finally(() => {
        setSummaryLoading(false);
      });
  }, [activeRange.from, activeRange.to, compare]);

  const loadCharts = useCallback(
    ({ refresh = false } = {}) => {
      return superadminService
        .getDashboardCharts({
          from: activeRange.from,
          to: activeRange.to,
          refresh,
        })
        .then((res) => {
          setCharts(res?.data || null);
          setChartsError("");
          setLastUpdatedAt(new Date());
        })
        .catch((err) => {
          setChartsError(err.message || "Failed to load dashboard charts.");
        })
        .finally(() => {
          setChartsLoading(false);
        });
    },
    [activeRange.from, activeRange.to]
  );

  // Fetch summary whenever filters change & poll every 45s while tab is visible
  useEffect(() => {
    let active = true;
    const run = () => {
      superadminService
        .getDashboardSummary({
          from: activeRange.from,
          to: activeRange.to,
          compare: compare ? "previous" : "none",
        })
        .then((res) => {
          if (!active) return;
          setSummary(res?.data || null);
          setSummaryError("");
          setLastUpdatedAt(new Date());
        })
        .catch((err) => {
          if (!active) return;
          setSummaryError(err.message || "Failed to load dashboard summary.");
        })
        .finally(() => {
          if (active) setSummaryLoading(false);
        });
    };

    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        run();
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeRange.from, activeRange.to, compare]);

  // Fetch charts whenever active date range changes
  useEffect(() => {
    let active = true;
    superadminService
      .getDashboardCharts({
        from: activeRange.from,
        to: activeRange.to,
      })
      .then((res) => {
        if (!active) return;
        setCharts(res?.data || null);
        setChartsError("");
        setLastUpdatedAt(new Date());
      })
      .catch((err) => {
        if (!active) return;
        setChartsError(err.message || "Failed to load dashboard charts.");
      })
      .finally(() => {
        if (active) setChartsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeRange.from, activeRange.to]);

  const handleSelectPreset = (nextPreset) => {
    setCustomError("");
    if (nextPreset === "custom") {
      setPreset("custom");
      setCustomFrom(activeRange.from);
      setCustomTo(activeRange.to);
      return;
    }
    const bounds = getPresetDateRange(nextPreset, getTodayDhaka());
    setPreset(nextPreset);
    setCustomFrom(bounds.from);
    setCustomTo(bounds.to);
    setSummaryLoading(true);
    setChartsLoading(true);
    setActiveRange(bounds);
  };

  const handleChangeCustomFrom = (nextFrom) => {
    setCustomFrom(nextFrom);
    const err = validateCustomRange(nextFrom, customTo);
    setCustomError(err);
    if (!err) {
      setSummaryLoading(true);
      setChartsLoading(true);
      setActiveRange({ from: nextFrom, to: customTo });
    }
  };

  const handleChangeCustomTo = (nextTo) => {
    setCustomTo(nextTo);
    const err = validateCustomRange(customFrom, nextTo);
    setCustomError(err);
    if (!err) {
      setSummaryLoading(true);
      setChartsLoading(true);
      setActiveRange({ from: customFrom, to: nextTo });
    }
  };

  const handleToggleCompare = (nextCompare) => {
    setSummaryLoading(true);
    setCompare(nextCompare);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    try {
      await Promise.all([loadSummary(), loadCharts({ refresh: true })]);
    } finally {
      setRefreshing(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleForceLogout = async (admin) => {
    if (!window.confirm(`Force logout ${admin.name || admin.email} across all devices?`)) return;
    try {
      await superadminService.forceLogout(admin.id);
      showToast(`Terminated active sessions for ${admin.name || admin.email}.`);
      loadSummary();
    } catch (err) {
      showToast(err.message || "Failed to terminate sessions.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <DashboardHeader
        preset={preset}
        activeFrom={activeRange.from}
        activeTo={activeRange.to}
        customFrom={customFrom}
        customTo={customTo}
        customError={customError}
        todayStr={initialState.todayStr}
        compare={compare}
        lastUpdatedAt={lastUpdatedAt}
        refreshing={refreshing}
        onSelectPreset={handleSelectPreset}
        onChangeCustomFrom={handleChangeCustomFrom}
        onChangeCustomTo={handleChangeCustomTo}
        onToggleCompare={handleToggleCompare}
        onRefresh={handleRefresh}
      />

      {toast && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {toast}
        </div>
      )}

      {/* Summary Error Banner (retains previous valid summary data on failure) */}
      {summaryError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300">
          <span>{summaryError}</span>
          <button
            type="button"
            onClick={() => {
              setSummaryLoading(true);
              loadSummary();
            }}
            className="font-semibold underline cursor-pointer"
          >
            Retry summary
          </button>
        </div>
      )}

      {/* 1. Needs Attention Strip */}
      <NeedsAttentionStrip
        attention={summary?.attention}
        isLoading={summaryLoading && !summary}
        error={summaryError}
        onRetry={() => {
          setSummaryLoading(true);
          loadSummary();
        }}
      />

      {/* 2. Business KPI Cards */}
      <BusinessKpiGrid
        kpis={summary?.kpis}
        compareEnabled={compare}
        isLoading={summaryLoading && !summary}
      />

      {/* 3. Recharts Section */}
      {chartsError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300">
          <span>{chartsError}</span>
          <button
            type="button"
            onClick={() => {
              setChartsLoading(true);
              loadCharts({ refresh: true });
            }}
            className="font-semibold underline cursor-pointer"
          >
            Retry charts
          </button>
        </div>
      )}

      {chartsLoading && !charts ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse lg:col-span-2" />
          <div className="h-72 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
          <div className="h-72 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
        </div>
      ) : (
        charts && (
          <div className="space-y-6">
            {/* Sales & Profit Trend */}
            <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Sales &amp; Net Profit Trend
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Delivered orders grouped by {charts.range?.bucket || "day"} in Bangladesh time
                  </p>
                </div>
              </div>
              <SalesProfitTrendChart
                data={charts.salesProfitTrend}
                bucket={charts.range?.bucket || "day"}
              />
            </section>

            {/* Brand Sales & Top Collections */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Sales by Brand
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                  Top partner brands from delivered orders
                </p>
                <HorizontalSalesBarChart
                  items={charts.salesByBrand}
                  color="#8B5CF6"
                  emptyMessage="No brand sales recorded in this period."
                />
              </section>

              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Top Collections
                  </h2>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 mb-4">
                  <IoInformationCircleOutline className="h-3.5 w-3.5 shrink-0" />
                  <span>{charts.topCollections?.overlapNote}</span>
                </p>
                <HorizontalSalesBarChart
                  items={charts.topCollections?.items || []}
                  color="#9B4F5E"
                  emptyMessage="No collection sales recorded in this period."
                />
              </section>
            </div>

            {/* Order Status & Returns by Reason */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Order Status Breakdown
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                  Orders placed during the selected date range
                </p>
                <OrderStatusDonutChart data={charts.orderStatusBreakdown} />
              </section>

              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Returns by Reason
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                  Return volume grouped by customer return reason
                </p>
                <ReturnsReasonBarChart data={charts.returnsByReason} />
              </section>
            </div>

            {/* Top 5 Products & Top 5 Customers */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Top 5 Products
                </h2>
                {charts.topProducts?.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {charts.topProducts.map((product, idx) => (
                      <div key={product.productId || idx} className="py-2.5 flex items-center gap-3 text-xs">
                        <div className="relative h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                          {product.imageUrl && (
                            <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{product.brandName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                            {formatMoney2(product.salesAmount)}
                          </p>
                          <p className="text-[11px] text-gray-400">{product.unitsSold} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-gray-400">
                    No delivered product sales in this period.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Top 5 Customers
                </h2>
                {charts.topCustomers?.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {charts.topCustomers.map((customer) => (
                      <div key={customer.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="font-semibold text-gray-900 dark:text-gray-100 hover:text-[#8B5CF6] truncate block"
                          >
                            {customer.name}
                          </Link>
                          <p className="text-[11px] text-gray-400 truncate">{customer.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                            {formatMoney2(customer.totalSpent)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {customer.orderCount} order(s)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-gray-400">
                    No customer spend recorded in this period.
                  </p>
                )}
              </section>
            </div>
          </div>
        )
      )}

      {/* 4. Team & Security Panels */}
      <TeamSecurityPanels
        team={summary?.team}
        security={summary?.security}
        isLoading={summaryLoading && !summary}
        onInviteAdmin={() => setInviteOpen(true)}
        onEditPermissions={(admin) => setEditTargetAdmin(admin)}
        onForceLogout={handleForceLogout}
      />

      {/* 5. Recent Activity Feed */}
      <RecentActivityFeed refreshKey={refreshKey} />

      {/* Modals */}
      <InviteAdminModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          showToast("Administrator invitation dispatched.");
          loadSummary();
        }}
      />

      <EditPermissionsModal
        isOpen={Boolean(editTargetAdmin)}
        admin={editTargetAdmin}
        onClose={() => setEditTargetAdmin(null)}
        onSuccess={() => {
          showToast("Administrator permissions updated.");
          loadSummary();
        }}
      />
    </div>
  );
}

export default function SuperadminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="h-36 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse" />
        </div>
      }
    >
      <SuperadminDashboardContent />
    </Suspense>
  );
}

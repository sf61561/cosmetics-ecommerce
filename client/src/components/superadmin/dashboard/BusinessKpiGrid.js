"use client";

import {
  IoCashOutline,
  IoTrendingUpOutline,
  IoReceiptOutline,
  IoCalculatorOutline,
  IoReturnUpBackOutline,
  IoPeopleOutline,
  IoHourglassOutline,
  IoWalletOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { formatMoney2 } from "@/components/charts/RechartsWidgets";

function DeltaBadge({ changePercent, compareEnabled, inverse = false }) {
  if (!compareEnabled) return null;
  if (changePercent === null || changePercent === undefined || !Number.isFinite(Number(changePercent))) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
        N/A vs prev
      </span>
    );
  }

  const num = Number(changePercent);
  const isPositive = num > 0;
  const isNeutral = num === 0;
  const good = inverse ? num < 0 : num > 0;

  const tone = isNeutral
    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    : good
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${tone}`}>
      {isPositive ? `+${num}%` : `${num}%`} vs prev
    </span>
  );
}

export default function BusinessKpiGrid({ kpis, compareEnabled, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const cards = [
    {
      label: "Total Sales",
      value: formatMoney2(kpis.totalSales?.value),
      sub: "Delivered orders",
      delta: kpis.totalSales?.changePercent,
      icon: IoCashOutline,
      iconBg: "bg-purple-50 text-[#8B5CF6] dark:bg-purple-950/60 dark:text-purple-300",
    },
    {
      label: "Net Sales",
      value: formatMoney2(kpis.netSales?.value),
      sub: "Sales minus returns",
      delta: kpis.netSales?.changePercent,
      icon: IoWalletOutline,
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
    },
    {
      label: "Net Profit",
      value: formatMoney2(kpis.netProfit?.value),
      sub: kpis.netProfit?.isProfitIncomplete
        ? `Incomplete (${kpis.netProfit.costPendingOrders} cost pending)`
        : "Item profit minus expenses",
      delta: kpis.netProfit?.changePercent,
      icon: IoTrendingUpOutline,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
      warning: kpis.netProfit?.isProfitIncomplete
        ? `Cost pending on ${kpis.netProfit.costPendingOrders} order(s)`
        : null,
    },
    {
      label: "Total Orders",
      value: (kpis.totalOrders?.value || 0).toLocaleString("en-BD"),
      sub: "Delivered in period",
      delta: kpis.totalOrders?.changePercent,
      icon: IoReceiptOutline,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
    },
    {
      label: "Average Order Value",
      value: formatMoney2(kpis.averageOrderValue?.value),
      sub: "Total sales ÷ orders",
      delta: kpis.averageOrderValue?.changePercent,
      icon: IoCalculatorOutline,
      iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300",
    },
    {
      label: "Return Rate",
      value: `${Number(kpis.returnRate?.value || 0).toFixed(2)}%`,
      sub: `${kpis.returnRate?.returnsCount || 0} return(s) (${formatMoney2(kpis.returnRate?.returnsValue)})`,
      delta: kpis.returnRate?.changePercent,
      inverse: true,
      icon: IoReturnUpBackOutline,
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    },
    {
      label: "New Customers",
      value: (kpis.newCustomers?.value || 0).toLocaleString("en-BD"),
      sub: "Registered in period",
      delta: kpis.newCustomers?.changePercent,
      icon: IoPeopleOutline,
      iconBg: "bg-pink-50 text-[#9B4F5E] dark:bg-pink-950/60 dark:text-pink-300",
    },
    {
      label: "Pending Orders",
      value: (kpis.pendingOrders?.value || 0).toLocaleString("en-BD"),
      sub: "Pipeline · not yet delivered",
      delta: kpis.pendingOrders?.changePercent,
      inverse: true,
      icon: IoHourglassOutline,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    },
  ];

  return (
    <section aria-label="Business KPIs" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums truncate">
                  {card.value}
                </p>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${card.iconBg}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{card.sub}</span>
              <DeltaBadge
                changePercent={card.delta}
                compareEnabled={compareEnabled}
                inverse={card.inverse}
              />
            </div>

            {card.warning && (
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                <IoWarningOutline className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{card.warning}</span>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

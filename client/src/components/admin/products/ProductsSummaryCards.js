"use client";

import { FaBoxOpen, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";

export default function ProductsSummaryCards({ summary = {}, isLoading = false }) {
  const cards = [
    {
      label: "Total Products",
      value: summary.total ?? 0,
      subtext: summary.totalInventoryValue
        ? `৳${Number(summary.totalInventoryValue).toLocaleString()} inventory`
        : "In product catalog",
      icon: FaBoxOpen,
      iconBg: "bg-pink-50 dark:bg-pink-950/60",
      iconColor: "text-[#9B4F5E] dark:text-pink-300",
      borderColor: "hover:border-[#9B4F5E]/30",
    },
    {
      label: "Active Products",
      value: summary.active ?? 0,
      subtext: `${summary.draft ?? 0} draft / ${summary.archived ?? 0} archived`,
      icon: FaCheckCircle,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "hover:border-emerald-500/30",
    },
    {
      label: "Low Stock Alert",
      value: summary.lowStock ?? 0,
      subtext: "At or below threshold",
      icon: FaExclamationTriangle,
      iconBg: "bg-amber-50 dark:bg-amber-950/60",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "hover:border-amber-500/30",
    },
    {
      label: "Out of Stock",
      value: summary.outOfStock ?? 0,
      subtext: "Replenishment needed",
      icon: FaTimesCircle,
      iconBg: "bg-red-50 dark:bg-red-950/60",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "hover:border-red-500/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-7 w-12 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-2.5 w-24 rounded-md bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="h-11 w-11 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all duration-200 ${card.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
                  {Number(card.value).toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {card.subtext}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg} ${card.iconColor} shadow-2xs shrink-0`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


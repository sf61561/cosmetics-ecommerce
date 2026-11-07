"use client";

import { FaStar, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function ReviewsSummaryCards({
  metrics = {},
  activeStatus = "all",
  onSelectStatus = () => {},
  isLoading = false,
}) {
  const cards = [
    {
      id: "all",
      label: "Total Reviews",
      value: metrics.total ?? 0,
      subtext: "All customer submissions",
      icon: FaStar,
      iconBg: "bg-pink-50 dark:bg-pink-950/60",
      iconColor: "text-[#9B4F5E] dark:text-pink-300",
      borderColor: activeStatus === "all" ? "border-[#9B4F5E]" : "hover:border-[#9B4F5E]/40",
      bgRing: activeStatus === "all" ? "ring-2 ring-[#9B4F5E]/20" : "",
    },
    {
      id: "pending",
      label: "Pending Moderation",
      value: metrics.pending ?? 0,
      subtext: "Requires admin review",
      icon: FaClock,
      iconBg: "bg-amber-50 dark:bg-amber-950/60",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: activeStatus === "pending" ? "border-amber-500" : "hover:border-amber-500/40",
      bgRing: activeStatus === "pending" ? "ring-2 ring-amber-500/20" : "",
    },
    {
      id: "approved",
      label: "Approved & Live",
      value: metrics.approved ?? 0,
      subtext: "Publicly visible on PDP",
      icon: FaCheckCircle,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: activeStatus === "approved" ? "border-emerald-500" : "hover:border-emerald-500/40",
      bgRing: activeStatus === "approved" ? "ring-2 ring-emerald-500/20" : "",
    },
    {
      id: "rejected",
      label: "Rejected Reviews",
      value: metrics.rejected ?? 0,
      subtext: "Awaiting user resubmission",
      icon: FaTimesCircle,
      iconBg: "bg-rose-50 dark:bg-rose-950/60",
      iconColor: "text-rose-600 dark:text-rose-400",
      borderColor: activeStatus === "rejected" ? "border-rose-500" : "hover:border-rose-500/40",
      bgRing: activeStatus === "rejected" ? "ring-2 ring-rose-500/20" : "",
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
                <div className="h-3 w-24 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-7 w-12 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-2.5 w-28 rounded-md bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectStatus(card.id)}
            className={`group flex items-start justify-between rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-left shadow-xs transition-all duration-200 cursor-pointer ${card.borderColor} ${card.bgRing}`}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {Number(card.value).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {card.subtext}
              </p>
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

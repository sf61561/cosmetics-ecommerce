"use client";

import { FaUsers, FaUserCheck, FaShoppingBag, FaUserPlus } from "react-icons/fa";

export default function CustomersSummaryCards({ summary = {}, isLoading = false }) {
  const cards = [
    {
      label: "Total Customers",
      value: summary.totalCustomers ?? 0,
      subtext: "Registered shoppers",
      icon: FaUsers,
      iconBg: "bg-pink-50 dark:bg-pink-950/60",
      iconColor: "text-[#9B4F5E] dark:text-pink-300",
      borderColor: "hover:border-[#9B4F5E]/30",
    },
    {
      label: "Active Customers",
      value: summary.activeCustomers ?? 0,
      subtext: "Eligible for checkout",
      icon: FaUserCheck,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "hover:border-emerald-500/30",
    },
    {
      label: "Customers With Orders",
      value: summary.customersWithOrders ?? 0,
      subtext: "Have placed ≥1 order",
      icon: FaShoppingBag,
      iconBg: "bg-blue-50 dark:bg-blue-950/60",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "hover:border-blue-500/30",
    },
    {
      label: "New Customers",
      value: summary.newCustomers ?? 0,
      subtext: "Joined last 30 days",
      icon: FaUserPlus,
      iconBg: "bg-amber-50 dark:bg-amber-950/60",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "hover:border-amber-500/30",
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
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all duration-200 ${card.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-2 font-serif text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {card.subtext}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${card.iconBg}`}>
                <IconComponent className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


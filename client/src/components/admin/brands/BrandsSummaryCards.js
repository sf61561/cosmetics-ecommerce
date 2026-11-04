"use client";

import { FaStore, FaCheckCircle, FaBoxOpen } from "react-icons/fa";

export default function BrandsSummaryCards({ summary, isLoading }) {
  const cards = [
    {
      title: "Total Brands",
      value: summary?.total ?? 0,
      description: "Registered beauty partners",
      icon: FaStore,
      iconBg: "bg-[#FBF0F0] dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300",
      borderAccent: "hover:border-[#9B4F5E]/30 dark:hover:border-[#9B4F5E]/50",
    },
    {
      title: "Active Brands",
      value: summary?.active ?? 0,
      description: "Live & visible on storefront",
      icon: FaCheckCircle,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300",
      borderAccent: "hover:border-emerald-300 dark:hover:border-emerald-600/50",
    },
    {
      title: "Associated Products",
      value: summary?.totalProducts ?? 0,
      description: `${summary?.featured ?? 0} marked as featured`,
      icon: FaBoxOpen,
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300",
      borderAccent: "hover:border-amber-300 dark:hover:border-amber-600/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all duration-200 ${card.borderAccent}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {card.title}
                </p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                ) : (
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {card.value.toLocaleString()}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${card.iconBg}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


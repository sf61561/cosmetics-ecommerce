"use client";

import { FaSearch, FaRedo, FaCheckDouble, FaTimes } from "react-icons/fa";

export default function ReviewsFilterBar({
  search = "",
  onSearchChange = () => {},
  status = "all",
  onStatusChange = () => {},
  rating = "all",
  onRatingChange = () => {},
  dateFrom = "",
  onDateFromChange = () => {},
  dateTo = "",
  onDateToChange = () => {},
  onResetFilters = () => {},
  selectedCount = 0,
  onBulkApprove = () => {},
  onClearSelection = () => {},
  isBulkApproving = false,
}) {
  const statusTabs = [
    { id: "all", label: "All Reviews" },
    { id: "pending", label: "Pending Moderation" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Status Tab Navigation ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/80 dark:border-gray-800 pb-3">
        {statusTabs.map((tab) => {
          const isActive = status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#9B4F5E] text-white shadow-xs"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Bulk Actions Ribbon (Conditional) ── */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-5 py-3 text-sm text-amber-900 dark:text-amber-200 transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/80 text-xs font-bold text-amber-800 dark:text-amber-200">
              {selectedCount}
            </span>
            <span className="font-medium">
              {selectedCount} review{selectedCount === 1 ? "" : "s"} selected for bulk action
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FaCheckDouble className="h-3 w-3" />
              {isBulkApproving ? "Approving..." : `Approve Selected (${selectedCount})`}
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            >
              <FaTimes className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Filter & Search Controls ── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs sm:text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by customer name, email, product, or order #..."
            className="w-full rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#9B4F5E] focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/20"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Star Rating Filter */}
          <select
            value={rating}
            onChange={(e) => onRatingChange(e.target.value)}
            className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 focus:border-[#9B4F5E] focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/20 cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>

          {/* Date From */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="hidden md:inline">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:border-[#9B4F5E] focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/20"
              title="Start Date"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="hidden md:inline">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:border-[#9B4F5E] focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/20"
              title="End Date"
            />
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={onResetFilters}
            title="Reset Filters"
            className="flex items-center justify-center rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FaRedo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


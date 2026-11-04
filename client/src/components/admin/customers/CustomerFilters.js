"use client";

import { useState } from "react";
import { FaSearch, FaTimes, FaFilter } from "react-icons/fa";

export default function CustomerFilters({
  search = "",
  setSearch = () => {},
  status = "all",
  setStatus = () => {},
  hasOrders = "all",
  setHasOrders = () => {},
  startDate = "",
  setStartDate = () => {},
  endDate = "",
  setEndDate = () => {},
  sortBy = "created_at",
  setSortBy = () => {},
  sortOrder = "DESC",
  setSortOrder = () => {},
  onReset = () => {},
}) {
  const [showDateFilter, setShowDateFilter] = useState(Boolean(startDate || endDate));

  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val === "created_at_desc") {
      setSortBy("created_at");
      setSortOrder("DESC");
    } else if (val === "created_at_asc") {
      setSortBy("created_at");
      setSortOrder("ASC");
    } else if (val === "name_asc") {
      setSortBy("name");
      setSortOrder("ASC");
    } else if (val === "order_count_desc") {
      setSortBy("order_count");
      setSortOrder("DESC");
    } else if (val === "total_spent_desc") {
      setSortBy("total_spent");
      setSortOrder("DESC");
    }
  };

  const currentSortVal =
    sortBy === "name"
      ? "name_asc"
      : sortBy === "order_count"
      ? "order_count_desc"
      : sortBy === "total_spent"
      ? "total_spent_desc"
      : sortOrder === "ASC"
      ? "created_at_asc"
      : "created_at_desc";

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "all" ||
    hasOrders !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    sortBy !== "created_at" ||
    sortOrder !== "DESC";

  return (
    <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
      {/* ── Top Row: Search & Dropdowns ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <FaTimes className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E] transition-all cursor-pointer"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </div>

        {/* Order History Filter */}
        <div>
          <select
            value={hasOrders}
            onChange={(e) => setHasOrders(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E] transition-all cursor-pointer"
          >
            <option value="all">All Customers (Orders & Leads)</option>
            <option value="yes">With Orders (≥1 purchase)</option>
            <option value="no">Without Orders (No purchases)</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <select
            value={currentSortVal}
            onChange={handleSortChange}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E] transition-all cursor-pointer"
          >
            <option value="created_at_desc">Joined Date: Newest First</option>
            <option value="created_at_asc">Joined Date: Oldest First</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="order_count_desc">Order Count: Highest</option>
            <option value="total_spent_desc">Total Spending: Highest</option>
          </select>
        </div>
      </div>

      {/* ── Secondary Row: Date Range Toggle & Clear Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              showDateFilter || startDate || endDate
                ? "bg-pink-50 dark:bg-pink-950/50 text-[#9B4F5E] dark:text-pink-300 border border-pink-200 dark:border-pink-900/60"
                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
            }`}
          >
            <FaFilter className="h-3 w-3" />
            <span>Date Range Filter</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <FaTimes className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Date Inputs if toggled */}
        {showDateFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 uppercase">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

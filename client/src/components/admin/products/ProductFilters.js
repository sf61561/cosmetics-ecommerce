"use client";

import { FaSearch, FaTimes, FaUndoAlt } from "react-icons/fa";

export default function ProductFilters({
  search,
  setSearch,
  status,
  setStatus,
  brandId,
  setBrandId,
  categoryId,
  setCategoryId,
  stockStatus,
  setStockStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  brands = [],
  categories = [],
  onReset,
}) {
  const statusTabs = [
    { label: "All Products", value: "all" },
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Archived", value: "archived" },
  ];

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "all" ||
    brandId !== "all" ||
    categoryId !== "all" ||
    stockStatus !== "all" ||
    sortBy !== "created_at" ||
    sortOrder !== "DESC";

  return (
    <div className="space-y-4">
      {/* Top Row: Status Tabs & Quick Reset */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-2">
        <div className="flex flex-wrap items-center gap-1">
          {statusTabs.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#9B4F5E] text-white shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors cursor-pointer self-end sm:self-auto"
          >
            <FaUndoAlt className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </div>

      {/* Second Row: Search bar & Multi-Filter Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-9 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-2xs focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/15 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <FaTimes className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Brand Dropdown */}
        <div>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-2xs focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-2xs focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Dropdown */}
        <div>
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-2xs focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (Alert)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-");
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-2xs focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden cursor-pointer"
          >
            <option value="created_at-DESC">Newest First</option>
            <option value="created_at-ASC">Oldest First</option>
            <option value="name-ASC">Name (A-Z)</option>
            <option value="name-DESC">Name (Z-A)</option>
            <option value="price-ASC">Price: Low to High</option>
            <option value="price-DESC">Price: High to Low</option>
            <option value="stock_quantity-ASC">Stock: Low to High</option>
          </select>
        </div>
      </div>
    </div>
  );
}

"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/**
 * Generate pagination button numbers with ellipsis.
 * Examples:
 * [1, 2, 3, 4, 5]
 * [1, 2, 3, 4, "...", 10]
 * [1, "...", 4, 5, 6, "...", 10]
 * [1, "...", 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [];
  if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push("...");
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
  itemLabel = "items",
  isLoading = false,
  variant = "card", // "card" | "attached"
  className = "",
}) {
  if (!totalItems || totalItems <= 0) {
    return null;
  }

  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, totalItems);

  const containerClasses =
    variant === "attached"
      ? "flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/40 text-xs sm:text-sm"
      : "flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 shadow-xs text-xs sm:text-sm";

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* ── Summary & Per-Page Controls ── */}
      <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400">
        <span>
          Showing{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {start}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {end}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {totalItems}
          </span>{" "}
          {itemLabel}
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200 dark:border-gray-700">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:border-[#9B4F5E] focus:outline-hidden disabled:opacity-50 cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Page Navigation Buttons ── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 cursor-pointer"
          >
            <FaChevronLeft className="h-2.5 w-2.5" />
          </button>

          {getPageNumbers(currentPage, totalPages).map((pageNum, idx) => {
            if (pageNum === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-1.5 text-xs text-gray-400 dark:text-gray-500 select-none"
                >
                  ...
                </span>
              );
            }
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(pageNum)}
                className={`inline-flex h-8 min-w-8 items-center justify-center px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#9B4F5E] text-white shadow-2xs"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 cursor-pointer"
          >
            <FaChevronRight className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}


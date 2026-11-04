"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaCheck,
  FaFolder,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBoxOpen,
} from "react-icons/fa";

export default function CollectionsTable({
  collections = [],
  isLoading = false,
  error = null,
  onRetry = () => {},
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onToggleStatus = () => {},
  sortBy = "created_at",
  sortOrder = "DESC",
  onSort = () => {},
}) {
  const [copiedSlug, setCopiedSlug] = useState(null);

  const handleCopySlug = (slug, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const renderSortIcon = (columnKey) => {
    if (sortBy !== columnKey) {
      return (
        <FaSort className="h-3 w-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sortOrder === "ASC" ? (
      <FaSortUp className="h-3 w-3 text-[#9B4F5E] dark:text-pink-400" />
    ) : (
      <FaSortDown className="h-3 w-3 text-[#9B4F5E] dark:text-pink-400" />
    );
  };

  // Error State
  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 mb-3">
          <FaFolder className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Failed to Load Collections
        </h3>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded-sm bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded-sm bg-gray-100 dark:bg-gray-800/60" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-8 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (!collections || collections.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF0F0] dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-3 shadow-inner">
          <FaFolder className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          No Collections Found
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No collections match your current filter or search criteria. Try modifying your filters or create a new collection.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
      {/* ─── DESKTOP TABLE VIEW (hidden on mobile) ─── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" className="py-4 pl-6 pr-3">
                Collection
              </th>
              <th
                scope="col"
                onClick={() => onSort("name")}
                className="group cursor-pointer px-3 py-4 select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name & Details</span>
                  {renderSortIcon("name")}
                </div>
              </th>
              <th scope="col" className="px-3 py-4">
                URL Slug
              </th>
              <th
                scope="col"
                onClick={() => onSort("product_count")}
                className="group cursor-pointer px-3 py-4 text-center select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Products</span>
                  {renderSortIcon("product_count")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSort("is_active")}
                className="group cursor-pointer px-3 py-4 text-center select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon("is_active")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSort("updated_at")}
                className="group cursor-pointer px-3 py-4 select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Modified</span>
                  {renderSortIcon("updated_at")}
                </div>
              </th>
              <th scope="col" className="py-4 pl-3 pr-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-normal">
            {collections.map((col) => {
              const formattedDate = col.updatedAt
                ? new Date(col.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <tr
                  key={col.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group cursor-default"
                >
                  {/* Thumbnail */}
                  <td className="py-4 pl-6 pr-3 w-16">
                    <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-2xs">
                      {col.imageUrl ? (
                        <Image
                          src={col.imageUrl}
                          alt={col.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="52px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                          <FaFolder className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name & Description */}
                  <td className="px-3 py-4 max-w-xs">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-[#9B4F5E] dark:group-hover:text-pink-400 transition-colors">
                      {col.name}
                    </div>
                    {col.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                        {col.description}
                      </p>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/80 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-mono text-gray-600 dark:text-gray-300">
                      <span className="truncate max-w-[120px]">{col.slug}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopySlug(col.slug, e)}
                        title="Copy slug"
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        {copiedSlug === col.slug ? (
                          <FaCheck className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <FaCopy className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Products Count */}
                  <td className="px-3 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <FaBoxOpen className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      {col.productCount ?? 0}
                    </span>
                  </td>

                  {/* Status with Quick Toggle */}
                  <td className="px-3 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(col)}
                      title={`Click to ${col.isActive ? "deactivate" : "activate"}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                        col.isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          col.isActive
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-gray-400 dark:bg-gray-500"
                        }`}
                      />
                      {col.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>

                  {/* Last Modified */}
                  <td className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(col)}
                        title="View Details"
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        <FaEye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(col)}
                        title="Edit Collection"
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-[#FBF0F0] dark:hover:bg-pink-950/50 hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors cursor-pointer"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(col)}
                        title="Delete Collection"
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── MOBILE CARD VIEW (visible on small screens) ─── */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {collections.map((col) => (
          <div key={col.id} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                {col.imageUrl ? (
                  <Image
                    src={col.imageUrl}
                    alt={col.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                    <FaFolder className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                    {col.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(col)}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                      col.isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {col.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
                {col.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                    {col.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    /{col.slug}
                  </span>
                  <span>•</span>
                  <span>{col.productCount ?? 0} products</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-50 dark:border-gray-800 pt-2">
              <button
                type="button"
                onClick={() => onView(col)}
                className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <FaEye className="h-3 w-3" /> View
              </button>
              <button
                type="button"
                onClick={() => onEdit(col)}
                className="flex items-center gap-1 rounded-full bg-[#FBF0F0] dark:bg-pink-950/60 px-3 py-1 text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:bg-[#ebd3d8] dark:hover:bg-pink-900/60 cursor-pointer"
              >
                <FaEdit className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(col)}
                className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer"
              >
                <FaTrash className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaCheck,
  FaStore,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBoxOpen,
  FaStar,
  FaExternalLinkAlt,
} from "react-icons/fa";

export default function BrandsTable({
  brands = [],
  isLoading = false,
  error = null,
  onRetry = () => {},
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onToggleStatus = () => {},
  onToggleFeatured = () => {},
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
          <FaStore className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Failed to Load Brands
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
              <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded-sm bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded-sm bg-gray-100 dark:bg-gray-800/60" />
              </div>
              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (!brands || brands.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF0F0] dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-3 shadow-inner">
          <FaStore className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          No Brands Found
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No brands match your current search or filter criteria. Register your first beauty brand or try different filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
      {/* ─── DESKTOP TABLE VIEW ─── */}
      <div className="hidden md:block overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
          <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" className="py-3 pl-5 pr-2 w-14">
                Brand
              </th>
              <th
                scope="col"
                onClick={() => onSort("name")}
                className="group cursor-pointer px-2.5 py-3 select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name & Info</span>
                  {renderSortIcon("name")}
                </div>
              </th>
              <th scope="col" className="px-2 py-3">
                URL Slug
              </th>
              <th scope="col" className="px-2 py-3">
                Website
              </th>
              <th
                scope="col"
                onClick={() => onSort("product_count")}
                className="group cursor-pointer px-2 py-3 text-center select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Products</span>
                  {renderSortIcon("product_count")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSort("is_featured")}
                className="group cursor-pointer px-2 py-3 text-center select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Featured</span>
                  {renderSortIcon("is_featured")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSort("is_active")}
                className="group cursor-pointer px-2 py-3 text-center select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon("is_active")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSort("updated_at")}
                className="group cursor-pointer px-2 py-3 select-none hover:text-gray-900 dark:hover:text-gray-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Modified</span>
                  {renderSortIcon("updated_at")}
                </div>
              </th>
              <th scope="col" className="py-3 pl-2 pr-5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-normal">
            {brands.map((brand) => {
              const formattedDate = brand.updatedAt
                ? new Date(brand.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <tr
                  key={brand.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group cursor-default"
                >
                  {/* Logo Thumbnail */}
                  <td className="py-3 pl-5 pr-2 w-14">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs">
                      {brand.logoUrl ? (
                        <Image
                          src={brand.logoUrl}
                          alt={brand.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                          <FaStore className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name & Description */}
                  <td className="px-2.5 py-3 min-w-[130px] max-w-[200px]">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs group-hover:text-[#9B4F5E] dark:group-hover:text-pink-400 transition-colors truncate">
                      {brand.name}
                    </div>
                    {brand.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400 dark:text-gray-500">
                        {brand.description}
                      </p>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-2 py-3">
                    <div className="inline-flex items-center gap-1 rounded-md border border-gray-200/80 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                      <span className="truncate max-w-[90px]">{brand.slug}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopySlug(brand.slug, e)}
                        title="Copy slug"
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        {copiedSlug === brand.slug ? (
                          <FaCheck className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <FaCopy className="h-2 w-2" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Official Website */}
                  <td className="px-2 py-3">
                    {brand.websiteUrl ? (
                      <a
                        href={brand.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#9B4F5E] dark:text-pink-400 hover:underline max-w-[110px] truncate"
                        title={brand.websiteUrl}
                      >
                        <span className="truncate">{brand.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                        <FaExternalLinkAlt className="h-2 w-2 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Product Count */}
                  <td className="px-2 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      <FaBoxOpen className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
                      {brand.productCount ?? 0}
                    </span>
                  </td>

                  {/* Featured Status Toggle */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleFeatured(brand)}
                      title={`Click to ${brand.isFeatured ? "unfeature" : "mark as featured"}`}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                        brand.isFeatured
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 hover:text-gray-600 border border-transparent"
                      }`}
                    >
                      <FaStar className={`h-2.5 w-2.5 ${brand.isFeatured ? "text-amber-500" : "text-gray-300 dark:text-gray-600"}`} />
                      <span>{brand.isFeatured ? "Featured" : "Standard"}</span>
                    </button>
                  </td>

                  {/* Status Toggle */}
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(brand)}
                      title={`Click to ${brand.isActive ? "deactivate" : "activate"}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer ${
                        brand.isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          brand.isActive
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-gray-400 dark:bg-gray-500"
                        }`}
                      />
                      {brand.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>

                  {/* Last Modified */}
                  <td className="px-2 py-3 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-3 pl-2 pr-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onView(brand)}
                        title="View Details"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        <FaEye className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(brand)}
                        title="Edit Brand"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-[#FBF0F0] dark:hover:bg-pink-950/50 hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors cursor-pointer"
                      >
                        <FaEdit className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(brand)}
                        title="Delete Brand"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── MOBILE CARD VIEW ─── */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {brands.map((brand) => (
          <div key={brand.id} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                    <FaStore className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                    {brand.name}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {brand.isFeatured && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                        <FaStar className="h-2.5 w-2.5 text-amber-500" />
                        Featured
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(brand)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                        brand.isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {brand.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
                {brand.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                    {brand.description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    /{brand.slug}
                  </span>
                  <span>•</span>
                  <span>{brand.productCount ?? 0} products</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-50 dark:border-gray-800 pt-2">
              <button
                type="button"
                onClick={() => onView(brand)}
                className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <FaEye className="h-3 w-3" /> View
              </button>
              <button
                type="button"
                onClick={() => onEdit(brand)}
                className="flex items-center gap-1 rounded-full bg-[#FBF0F0] dark:bg-pink-950/60 px-3 py-1 text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:bg-[#ebd3d8] dark:hover:bg-pink-900/60 cursor-pointer"
              >
                <FaEdit className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(brand)}
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


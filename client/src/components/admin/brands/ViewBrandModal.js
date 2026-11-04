"use client";

import Image from "next/image";
import { FaTimes, FaEdit, FaBoxOpen, FaCalendarAlt, FaLink, FaStore, FaStar, FaExternalLinkAlt } from "react-icons/fa";

export default function ViewBrandModal({ isOpen, onClose, brand, onEdit }) {
  if (!isOpen || !brand) return null;

  const formattedCreated = brand.createdAt
    ? new Date(brand.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const formattedUpdated = brand.updatedAt
    ? new Date(brand.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex flex-col w-full max-w-xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-100 dark:border-gray-800 z-10">
        {/* Banner with centered logo */}
        <div className="relative shrink-0 h-36 w-full bg-gradient-to-br from-[#FBF0F0] to-[#EED9DC] dark:from-gray-800 dark:to-gray-900 flex items-center justify-center overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>

          {/* Logo container */}
          <div className="relative h-20 w-20 rounded-2xl border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#9B4F5E]/50 dark:text-pink-400/50">
                <FaStore className="h-9 w-9" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {brand.name}
                </h2>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    brand.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      brand.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  {brand.isActive ? "Active" : "Inactive"}
                </span>

                {/* Featured Badge */}
                {brand.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                    <FaStar className="h-3 w-3 text-amber-500" />
                    Featured Partner
                  </span>
                )}
              </div>

              {/* Slug Pill */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FaLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                <code className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                  /brands/{brand.slug}
                </code>
              </div>
            </div>
          </div>

          {/* Official Website */}
          {brand.websiteUrl && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Official Website:</span>
              <a
                href={brand.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#9B4F5E] dark:text-pink-400 font-medium hover:underline"
              >
                <span>{brand.websiteUrl}</span>
                <FaExternalLinkAlt className="h-2.5 w-2.5" />
              </a>
            </div>
          )}

          {/* Description */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              Brand Philosophy & Overview
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {brand.description || "No description provided for this brand."}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaBoxOpen className="h-3.5 w-3.5 text-[#9B4F5E] dark:text-pink-400" />
                Associated Products
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {brand.productCount ?? 0}{" "}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">items</span>
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                Last Modified
              </div>
              <p
                className="mt-1 text-xs font-medium text-gray-800 dark:text-gray-200 truncate"
                title={formattedUpdated}
              >
                {formattedUpdated}
              </p>
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <span>Registered: {formattedCreated}</span>
            <span>ID: {brand.id}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/80 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(brand);
            }}
            className="flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer"
          >
            <FaEdit className="h-3 w-3" />
            Edit Brand
          </button>
        </div>
      </div>
    </div>
  );
}


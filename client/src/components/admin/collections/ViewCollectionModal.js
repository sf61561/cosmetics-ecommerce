"use client";

import Image from "next/image";
import { FaTimes, FaEdit, FaBoxOpen, FaCalendarAlt, FaLink, FaFolder } from "react-icons/fa";

export default function ViewCollectionModal({ isOpen, onClose, collection, onEdit }) {
  if (!isOpen || !collection) return null;

  const formattedCreated = collection.createdAt
    ? new Date(collection.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const formattedUpdated = collection.updatedAt
    ? new Date(collection.updatedAt).toLocaleDateString("en-US", {
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
        {/* Banner Image or Fallback */}
        <div className="relative shrink-0 h-40 sm:h-44 w-full bg-gradient-to-br from-[#FBF0F0] to-[#EED9DC] dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          {collection.imageUrl ? (
            <Image
              src={collection.imageUrl}
              alt={collection.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9B4F5E]/40 dark:text-pink-400/40">
              <FaFolder className="h-14 w-14" />
            </div>
          )}
          {/* Close Button overlay */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {collection.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    collection.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      collection.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  {collection.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Slug Pill */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FaLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                <code className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                  /collections/{collection.slug}
                </code>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              Description
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {collection.description || "No description provided for this collection."}
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
                {collection.productCount ?? 0}{" "}
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
            <span>Created: {formattedCreated}</span>
            <span>ID: {collection.id}</span>
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
              onEdit(collection);
            }}
            className="flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer"
          >
            <FaEdit className="h-3 w-3" />
            Edit Collection
          </button>
        </div>
      </div>
    </div>
  );
}

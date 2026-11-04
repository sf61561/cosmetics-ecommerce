"use client";

import { FaTrash, FaSpinner, FaArchive } from "react-icons/fa";

export default function DeleteProductDialog({
  isOpen,
  onClose,
  onConfirmDelete,
  onArchiveInstead,
  product,
  isDeleting = false,
}) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-100 dark:border-gray-800 z-10 p-6 text-center">
        {/* Warning Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shadow-sm mb-4">
          <FaTrash className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Delete Product?
        </h3>

        {/* Description */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-2">
          <p>
            Are you sure you want to permanently delete{" "}
            <strong className="text-gray-800 dark:text-gray-200 font-semibold">
              {product.name}
            </strong>
            ?
          </p>
          <p className="bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 text-left">
            This action will remove the product and all associated Cloudinary images from your catalog. This cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {product.status !== "ARCHIVED" && (
            <button
              type="button"
              onClick={() => onArchiveInstead(product)}
              disabled={isDeleting}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer disabled:opacity-50"
            >
              <FaArchive className="h-3 w-3" /> Archive Instead
            </button>
          )}

          <button
            type="button"
            onClick={() => onConfirmDelete(product)}
            disabled={isDeleting}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isDeleting && <FaSpinner className="h-3 w-3 animate-spin" />}
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

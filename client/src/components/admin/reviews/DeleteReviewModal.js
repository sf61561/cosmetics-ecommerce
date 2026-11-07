"use client";

import { FaTrash, FaTimes, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

export default function DeleteReviewModal({
  isOpen = false,
  onClose = () => {},
  review = null,
  onConfirm = () => {},
  isDeleting = false,
}) {
  if (!isOpen || !review) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-md max-h-[85vh] rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <FaTrash className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Delete Review
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
          <p>
            Are you sure you want to permanently delete this review by{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {review.customer_name || "Customer"}
            </span>{" "}
            for{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {review.product_name}
            </span>
            ?
          </p>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <FaExclamationTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              This action cannot be undone. Any uploaded review photos will be removed, and the product&apos;s rating score and review count will be automatically recalculated.
            </p>
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(review.id)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <FaSpinner className="h-3 w-3 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Review"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

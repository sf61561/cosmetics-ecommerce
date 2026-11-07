"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaExclamationTriangle, FaSpinner } from "react-icons/fa";

const QUICK_REASONS = [
  "Inappropriate or offensive language",
  "Mentions competitors or external website links",
  "Spam, promotional, or fake review content",
  "Review is unrelated to the purchased cosmetics product",
  "Contains private contact information or addresses",
];

export default function RejectReviewModal({
  isOpen = false,
  onClose = () => {},
  review = null,
  onConfirm = () => {},
  isSubmitting = false,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason(review?.rejection_reason || "");
      setError("");
    }
  }, [isOpen, review]);

  if (!isOpen || !review) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a rejection reason. The customer will receive this feedback.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Please write at least 5 characters explaining why the review was rejected.");
      return;
    }
    onConfirm(review.id, reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-lg max-h-[85vh] rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <FaExclamationTriangle className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Reject Review
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              You are rejecting the review by{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {review.customer_name || "Customer"}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {review.product_name}
              </span>
              . Please state the reason so the customer can edit and resubmit.
            </p>

            {/* Quick Reason Chips */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Quick Reason Suggestions:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReason(suggestion);
                      setError("");
                    }}
                    className="rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-300 hover:border-[#9B4F5E] hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
                rows={4}
                placeholder="Explain clearly why this review cannot be approved..."
                className="w-full rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-3.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                maxLength={500}
                required
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                <span>{error ? <span className="text-rose-500 font-medium">{error}</span> : "Customer will see this explanation"}</span>
                <span>{reason.length} / 500</span>
              </div>
            </div>
          </div>

          {/* Pinned Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="h-3 w-3 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

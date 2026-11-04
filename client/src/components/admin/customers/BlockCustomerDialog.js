"use client";

import { useState } from "react";
import { FaBan, FaCheck, FaTimes, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

export default function BlockCustomerDialog({
  isOpen = false,
  customer = null,
  onClose = () => {},
  onConfirm = async () => {},
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !customer) return null;

  const isBlocking = customer.status !== "BLOCKED";

  const handleAction = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(customer.id, isBlocking ? "BLOCKED" : "ACTIVE");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update customer status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="relative w-full max-w-md rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div
            className={`p-3 rounded-2xl ${
              isBlocking
                ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isBlocking ? (
              <FaBan className="h-6 w-6" />
            ) : (
              <FaCheck className="h-6 w-6" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-gray-100">
            {isBlocking ? "Block Customer Account?" : "Unblock Customer Account?"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {isBlocking ? (
              <>
                Are you sure you want to block{" "}
                <strong className="text-gray-900 dark:text-white">
                  {customer.name}
                </strong>
                ? All active refresh sessions will be instantly revoked and the user will be barred from signing in or checking out.
              </>
            ) : (
              <>
                Are you sure you want to restore active access for{" "}
                <strong className="text-gray-900 dark:text-white">
                  {customer.name}
                </strong>
                ? The user will be permitted to log in, browse, and place orders.
              </>
            )}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <FaExclamationTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
              isBlocking
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isSubmitting && <FaSpinner className="h-3 w-3 animate-spin" />}
            <span>{isBlocking ? "Yes, Block Account" : "Yes, Restore Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


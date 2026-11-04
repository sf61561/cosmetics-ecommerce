"use client";

import { FaTrash, FaExclamationTriangle, FaSpinner, FaEyeSlash } from "react-icons/fa";

export default function DeleteBrandDialog({
  isOpen,
  onClose,
  onConfirmDelete,
  onDeactivateInstead,
  brand,
  isDeleting = false,
}) {
  if (!isOpen || !brand) return null;

  const hasLinkedProducts = Boolean(brand.productCount && brand.productCount > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-100 dark:border-gray-800 z-10 p-6 text-center">
        {/* Icon */}
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            hasLinkedProducts
              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
              : "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"
          } shadow-sm mb-4`}
        >
          {hasLinkedProducts ? (
            <FaExclamationTriangle className="h-6 w-6" />
          ) : (
            <FaTrash className="h-6 w-6" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {hasLinkedProducts ? "Cannot Delete Brand" : "Delete Brand?"}
        </h3>

        {/* Description */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-2">
          {hasLinkedProducts ? (
            <>
              <p>
                <strong className="text-gray-800 dark:text-gray-200 font-semibold">
                  {brand.name}
                </strong>{" "}
                currently has{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {brand.productCount} associated product(s)
                </span>
                .
              </p>
              <p className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-left">
                To protect store catalog integrity, brands with active products cannot be deleted.
                You can <strong>deactivate</strong> this brand to hide it from your customers
                instead.
              </p>
            </>
          ) : (
            <>
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="text-gray-800 dark:text-gray-200 font-semibold">
                  {brand.name}
                </strong>
                ?
              </p>
              <p className="text-red-500 dark:text-red-400 font-medium">
                This will delete the brand record and remove its logo from Cloudinary.
                This action cannot be undone.
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          {hasLinkedProducts ? (
            <button
              type="button"
              onClick={() => onDeactivateInstead(brand)}
              disabled={isDeleting || !brand.isActive}
              className="flex items-center justify-center gap-1.5 rounded-full bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FaEyeSlash className="h-3 w-3" />
              {brand.isActive ? "Deactivate Instead" : "Already Inactive"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConfirmDelete(brand.id)}
              disabled={isDeleting}
              className="flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <FaSpinner className="h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <FaTrash className="h-3 w-3" />
                  Delete Permanently
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


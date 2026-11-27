"use client";

import { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import StorefrontPreviewFrame from "./StorefrontPreviewFrame";

export default function StorefrontPreviewDrawer({
  isOpen,
  onClose,
  title = "Storefront Preview",
  path = "/",
  canPreviewDrafts = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex h-full w-full max-w-5xl flex-col bg-gray-50 dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3.5 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Live customer view rendered in safe read-only preview mode
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close storefront preview"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <StorefrontPreviewFrame
            initialPath={path}
            showPageSelector={false}
            canPreviewDrafts={canPreviewDrafts}
            heightClass="h-[calc(100vh-12rem)] min-h-[480px]"
          />
        </div>
      </div>
    </div>
  );
}

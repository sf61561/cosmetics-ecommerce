"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaTimes,
  FaStar,
  FaCheck,
  FaTrash,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaShieldAlt,
} from "react-icons/fa";

export default function ReviewDetailModal({
  isOpen = false,
  onClose = () => {},
  review = null,
  onApprove = () => {},
  onOpenReject = () => {},
  onOpenDelete = () => {},
  onImageClick = () => {},
}) {
  if (!isOpen || !review) return null;

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <FaStar
            key={s}
            className={`h-4 w-4 ${
              s <= rating ? "text-amber-400" : "text-gray-200 dark:text-gray-700"
            }`}
          />
        ))}
        <span className="ml-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">
          {rating}.0 / 5.0
        </span>
      </div>
    );
  };

  const formatVariant = (variantInfo) => {
    if (!variantInfo) return null;
    if (typeof variantInfo === "string") return variantInfo;
    if (variantInfo.displayText) return variantInfo.displayText;
    if (variantInfo.optionsKey) return variantInfo.optionsKey;
    if (variantInfo.shadeName || variantInfo.size) {
      const parts = [];
      if (variantInfo.shadeName) parts.push(`Shade: ${variantInfo.shadeName}`);
      if (variantInfo.size) parts.push(`Size: ${variantInfo.size}`);
      return parts.join(", ");
    }
    return null;
  };

  const imagesList = Array.isArray(review.images)
    ? review.images.map((img) => (typeof img === "string" ? img : img.imagePath || img.url))
    : [];

  const variantText = formatVariant(review.variant_info);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header (Pinned) ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Review Details
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                review.status === "approved"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : review.status === "rejected"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              {review.status}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-700 dark:text-gray-300">
          {/* Rejection Reason Alert (if rejected) */}
          {review.status === "rejected" && review.rejection_reason && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-start gap-2.5">
                <FaExclamationTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900 dark:text-rose-100">
                    Rejection Reason
                  </p>
                  <p className="mt-1 leading-relaxed">{review.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer & Order Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Customer Information
              </span>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                {review.customer_name || "Unknown"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {review.customer_email || "No email available"}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FaShieldAlt className="h-3 w-3" />
                Verified Purchase
              </div>
            </div>

            {/* Order & Product Box */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Order & Variant
              </span>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                Order #{review.order_number || review.order_id}
              </p>
              {variantText ? (
                <p className="mt-1 text-xs text-[#9B4F5E] dark:text-pink-300 font-medium">
                  {variantText}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-400 italic">Default variant</p>
              )}
              <p className="mt-2 text-[11px] text-gray-400">
                Submitted on{" "}
                {review.created_at
                  ? new Date(review.created_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Product Banner */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-800/30">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50">
              {review.product_thumbnail ? (
                <Image
                  src={review.product_thumbnail}
                  alt={review.product_name || "Product"}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">
                  🧴
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {review.product_name}
              </p>
              <Link
                href={`/products/${review.product_slug || review.product_id}`}
                target="_blank"
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#9B4F5E] dark:text-pink-300 hover:underline"
              >
                View product page
                <FaExternalLinkAlt className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>

          {/* Rating & Comment */}
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Rating
              </span>
              <div className="mt-1">{renderStars(review.rating)}</div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Customer Comment
              </span>
              {review.comment ? (
                <div className="mt-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {review.comment}
                </div>
              ) : (
                <p className="mt-1 text-xs italic text-gray-400">
                  Customer did not write a comment (rating only).
                </p>
              )}
            </div>
          </div>

          {/* Uploaded Customer Photos Gallery */}
          {imagesList.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Customer Photos ({imagesList.length})
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                {imagesList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onImageClick(imgUrl)}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-[#9B4F5E] transition-all cursor-pointer"
                  >
                    <Image
                      src={imgUrl}
                      alt={`Review photo ${idx + 1}`}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="120px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer (Pinned) ── */}
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenDelete(review)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-900 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
          >
            <FaTrash className="h-3 w-3" />
            Delete Review
          </button>

          <div className="flex items-center gap-2.5">
            {review.status !== "rejected" && (
              <button
                type="button"
                onClick={() => onOpenReject(review)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <FaTimes className="h-3 w-3" />
                Reject
              </button>
            )}

            {review.status !== "approved" && (
              <button
                type="button"
                onClick={() => onApprove(review.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FaCheck className="h-3 w-3" />
                Approve Review
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

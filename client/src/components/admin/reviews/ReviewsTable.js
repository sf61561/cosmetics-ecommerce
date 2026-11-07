"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaStar,
  FaCheck,
  FaTimes,
  FaEye,
  FaTrash,
  FaImage,
  FaExclamationCircle,
} from "react-icons/fa";

export default function ReviewsTable({
  reviews = [],
  selectedIds = [],
  onSelectRow = () => {},
  onSelectAll = () => {},
  onApprove = () => {},
  onOpenRejectModal = () => {},
  onOpenDeleteModal = () => {},
  onOpenDetailModal = () => {},
  isLoading = false,
}) {
  // Only pending reviews can be bulk-selected or batch-approved
  const pendingReviews = reviews.filter((r) => r.status === "pending");
  const allPendingSelected =
    pendingReviews.length > 0 &&
    pendingReviews.every((r) => selectedIds.includes(r.id));

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating ? "text-amber-400" : "text-gray-200 dark:text-gray-700"
            }`}
          />
        ))}
        <span className="ml-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
          {rating}.0
        </span>
      </div>
    );
  };

  const getStatusBadge = (status, rejectionReason) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300"
            title={rejectionReason ? `Reason: ${rejectionReason}` : "Review rejected"}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
    }
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

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="p-8 text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#9B4F5E] border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-4">
          <FaStar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          No reviews found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No customer reviews match the selected status, rating, or search parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          {/* Header */}
          <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" className="w-10 px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  disabled={pendingReviews.length === 0}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#9B4F5E] focus:ring-[#9B4F5E]/30 cursor-pointer disabled:opacity-40"
                  title="Select all pending reviews"
                />
              </th>
              <th scope="col" className="px-4 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-4 py-3.5">
                Product
              </th>
              <th scope="col" className="px-4 py-3.5">
                Rating
              </th>
              <th scope="col" className="px-4 py-3.5 max-w-[240px]">
                Comment
              </th>
              <th scope="col" className="px-3 py-3.5 text-center">
                Images
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Submitted
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {reviews.map((rev) => {
              const isSelected = selectedIds.includes(rev.id);
              const variantLabel = formatVariant(rev.variant_info);
              const isPending = rev.status === "pending";

              return (
                <tr
                  key={rev.id}
                  className={`transition-colors hover:bg-pink-50/20 dark:hover:bg-gray-800/40 ${
                    isSelected ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectRow(rev.id)}
                      disabled={!isPending}
                      className="rounded border-gray-300 dark:border-gray-600 text-[#9B4F5E] focus:ring-[#9B4F5E]/30 cursor-pointer disabled:opacity-40"
                      title={isPending ? "Select for action" : "Only pending reviews can be batch-approved"}
                    />
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/60 font-semibold text-xs text-[#9B4F5E] dark:text-pink-300">
                        {(rev.customer_name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {rev.customer_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {rev.customer_email || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                        {rev.product_thumbnail ? (
                          <Image
                            src={rev.product_thumbnail}
                            alt={rev.product_name || "Product"}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            🧴
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/products/${rev.product_slug || rev.product_id}`}
                          target="_blank"
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors line-clamp-1"
                        >
                          {rev.product_name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {variantLabel && (
                            <span className="inline-block rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                              {variantLabel}
                            </span>
                          )}
                          {rev.order_number && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              #{rev.order_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {renderStars(rev.rating)}
                  </td>

                  {/* Comment */}
                  <td className="px-4 py-3.5 max-w-[240px]">
                    {rev.comment ? (
                      <p
                        onClick={() => onOpenDetailModal(rev)}
                        className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        title="Click to view full comment"
                      >
                        “{rev.comment}”
                      </p>
                    ) : (
                      <span className="text-xs italic text-gray-400 dark:text-gray-500">
                        No written comment
                      </span>
                    )}
                  </td>

                  {/* Images */}
                  <td className="px-3 py-3.5 text-center">
                    {rev.image_count > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenDetailModal(rev)}
                        className="inline-flex items-center gap-1 rounded-full bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 px-2 py-0.5 text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:bg-pink-100 transition-colors cursor-pointer"
                        title="View review images"
                      >
                        <FaImage className="h-3 w-3" />
                        {rev.image_count}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {getStatusBadge(rev.status, rev.rejection_reason)}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {rev.created_at
                      ? new Date(rev.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Detail Button */}
                      <button
                        type="button"
                        onClick={() => onOpenDetailModal(rev)}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="View Review Details"
                      >
                        <FaEye className="h-3.5 w-3.5" />
                      </button>

                      {/* Quick Approve (if pending or rejected) */}
                      {rev.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => onApprove(rev.id)}
                          className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                          title="Approve Review"
                        >
                          <FaCheck className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Quick Reject (if pending or approved) */}
                      {rev.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => onOpenRejectModal(rev)}
                          className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                          title="Reject Review"
                        >
                          <FaTimes className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onOpenDeleteModal(rev)}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


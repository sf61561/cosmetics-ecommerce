"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaTimesCircle, FaBox, FaTruck, FaClock, FaStar, FaRedo } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { orderService } from "@/services/orderService";
import { reviewService } from "@/services/reviewService";
import ReviewModal from "@/components/modals/ReviewModal";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const statusColors = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  returned: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const statusLabels = {
  pending: "Pending Review",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const timelineSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  // Review states
  const [reviewsMap, setReviewsMap] = useState({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTargetProduct, setReviewTargetProduct] = useState({});
  const [reviewTargetItem, setReviewTargetItem] = useState({});
  const [reviewTargetExisting, setReviewTargetExisting] = useState(null);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await orderService.getById(id);
      setOrder(data);

      if (data && data.status === "delivered" && Array.isArray(data.items) && data.items.length > 0) {
        try {
          const itemIds = data.items.map((it) => it.id);
          const revs = await reviewService.getOrderItemsReviewStatus(itemIds);
          setReviewsMap(revs || {});
        } catch {
          // Non-blocking review status fetch
        }
      }
    } catch (err) {
      setError(err.message || "Unable to load order details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleOpenReview = (item, existing = null) => {
    setReviewTargetProduct({
      id: item.productId,
      name: item.productName,
      thumbnailUrl: item.imageUrl,
    });
    setReviewTargetItem({
      id: item.id,
      orderId: order?.id,
      variantText: item.sku || null,
    });
    setReviewTargetExisting(existing);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = (savedReview) => {
    if (savedReview && savedReview.order_item_id) {
      setReviewsMap((prev) => ({
        ...prev,
        [savedReview.order_item_id]: savedReview,
      }));
    }
  };

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    setIsCancelling(true);
    setCancelMessage("");
    try {
      await orderService.cancel(order.id, cancelReason);
      setCancelModalOpen(false);
      await loadOrder();
    } catch (err) {
      setCancelMessage(err.message || "Failed to cancel order.");
    } finally {
      setIsCancelling(false);
    }
  };

  const currentStepIndex = order ? timelineSteps.indexOf(order.status) : -1;
  const isTerminal = order?.status === "cancelled" || order?.status === "returned";

  return (
    <ProfileLayout title={`Order ${order?.orderNumber || ""}`} description="Order fulfillment status, delivery information, and purchased items.">
      <div className="mb-4">
        <Link href="/orders" className="text-sm font-semibold text-[#9B4F5E] hover:underline">
          ← Back to all orders
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button onClick={loadOrder} className="mt-2 font-semibold underline">Retry loading</button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900">
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-[#9B4F5E] border-t-transparent" />
          <span className="mt-4 block font-medium">Loading your order details...</span>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Status Header Card */}
          <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Order Placed on {new Date(order.placedAt || order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
                <h1 className="mt-1 text-2xl font-bold">{order.orderNumber}</h1>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                  {statusLabels[order.status] || order.status}
                </span>
                {order.canCancel && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Cancel order
                  </button>
                )}
              </div>
            </div>

            {/* Fulfillment Timeline */}
            {!isTerminal ? (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Fulfillment Status</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {timelineSteps.map((step, idx) => {
                    const isDone = currentStepIndex >= idx;
                    const isCurrent = currentStepIndex === idx;
                    return (
                      <div key={step} className="flex flex-col items-center text-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isDone
                            ? "border-[#9B4F5E] bg-[#9B4F5E] text-white"
                            : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800"
                        } ${isCurrent ? "ring-4 ring-[#FBF0F0]" : ""}`}>
                          {isDone ? <FaCheckCircle className="h-4 w-4" /> : <FaClock className="h-4 w-4" />}
                        </div>
                        <span className={`mt-2 text-xs capitalize ${isCurrent ? "font-bold text-[#9B4F5E]" : isDone ? "font-semibold text-gray-800 dark:text-gray-200" : "text-gray-400"}`}>
                          {statusLabels[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`mt-6 rounded-2xl p-4 text-sm ${order.status === "cancelled" ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800"}`}>
                <p className="font-semibold">{order.status === "cancelled" ? "This order was cancelled." : "This order was returned."}</p>
                <p className="mt-1 text-xs opacity-90">Stock was restored and payment status is {order.paymentStatus}.</p>
              </div>
            )}

            {/* Courier / Tracking info if shipped */}
            {(order.courierName || order.trackingNumber) && (
              <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50">
                  <FaTruck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-indigo-900 dark:text-indigo-200">
                    Handed to courier: <strong className="font-semibold">{order.courierName || "Standard Dispatch"}</strong>
                  </p>
                  {order.trackingNumber && (
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                      Tracking No: {order.trackingNumber}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Delivery Details */}
            <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delivery Information</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{order.shipping?.name}</p>
                <p>{order.shipping?.phone}</p>
                <p className="leading-relaxed">
                  {order.shipping?.address}, {order.shipping?.area}, {order.shipping?.city}
                  {order.shipping?.postalCode ? ` - ${order.shipping?.postalCode}` : ""}
                </p>
                {order.customerNote && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <span className="font-semibold block mb-1">Your Delivery Note:</span>
                    {order.customerNote}
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Price Breakdown</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Product Subtotal</span>
                  <span>{money(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>-{money(order.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Delivery Fee</span>
                  <span>{money(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-gray-100">
                  <span>Grand Total</span>
                  <span className="text-[#9B4F5E]">{money(order.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Ordered Products ({order.items.length})</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {order.items.map((item) => {
                const itemReview = reviewsMap[item.id];
                const isDelivered = order.status === "delivered";

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <FaBox className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{item.productName}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {money(item.unitPrice)} × {item.quantity} {item.sku ? `· SKU: ${item.sku}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{money(item.lineTotal)}</span>
                      </div>
                    </div>

                    {/* Review Action / Status for Delivered Orders */}
                    {isDelivered && (
                      <div className="flex items-center justify-end pt-1">
                        {!itemReview ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#9B4F5E] text-white hover:bg-[#85414f] transition-colors cursor-pointer shadow-2xs"
                          >
                            <FaStar className="w-3 h-3 text-amber-300" />
                            <span>Write a Review</span>
                          </button>
                        ) : itemReview.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <FaClock className="w-3 h-3" />
                            <span>Review submitted, awaiting approval</span>
                          </span>
                        ) : itemReview.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <FaCheckCircle className="w-3 h-3" />
                            <span>Review published</span>
                          </span>
                        ) : itemReview.status === "rejected" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <FaTimesCircle className="w-3 h-3" />
                              <span>Review rejected{itemReview.rejection_reason ? `: ${itemReview.rejection_reason}` : ""}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(item, itemReview)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#9B4F5E] dark:text-pink-400 hover:underline cursor-pointer"
                            >
                              <FaRedo className="w-2.5 h-2.5" />
                              <span>Resubmit</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status History Timeline */}
          {order.history?.length > 0 && (
            <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Order History</h2>
              <ol className="relative ml-2 space-y-4 border-l border-gray-200 dark:border-gray-700">
                {order.history.map((h) => (
                  <li key={h.id} className="relative pl-6">
                    <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#9B4F5E] dark:border-gray-900" />
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Status changed to <span className="capitalize font-bold text-[#9B4F5E]">{statusLabels[h.toStatus] || h.toStatus}</span>
                    </p>
                    {h.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.note}</p>}
                    <time className="text-[11px] text-gray-400 block mt-1">
                      {new Date(h.createdAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : null}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Order {order?.orderNumber}?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to cancel this order? This will restore the products to inventory.
            </p>
            {cancelMessage && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cancelMessage}
              </div>
            )}
            <form onSubmit={handleCancelOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Reason for Cancellation (Optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Ordered by mistake, want to change items..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        product={reviewTargetProduct}
        orderItem={reviewTargetItem}
        existingReview={reviewTargetExisting}
        onSuccess={handleReviewSuccess}
      />
    </ProfileLayout>
  );
}


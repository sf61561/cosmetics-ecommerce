"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaBox, FaPrint } from "react-icons/fa";
import { adminOrderService } from "@/services/adminOrderService";

const labels = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const statusColors = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  returned: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const ALLOWED_ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function AdminOrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Status transition dialog state (admin note is captured here onetime for each transition)
  const [transitionDialog, setTransitionDialog] = useState({ open: false, targetStatus: "", note: "" });

  const loadOrder = async () => {
    try {
      const result = await adminOrderService.getById(id);
      setOrder(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleExecuteTransition = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError("");
    setSuccessMessage("");
    try {
      await adminOrderService.updateStatus(id, transitionDialog.targetStatus, {
        note: transitionDialog.note,
        adminNote: transitionDialog.note,
      });
      setTransitionDialog({ open: false, targetStatus: "", note: "" });
      setSuccessMessage(`Order status updated to ${labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}.`);
      await loadOrder();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!order && !error) return <p className="py-12 text-center text-sm text-gray-500">Loading order details...</p>;
  if (!order) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  const currentStatus = order.status?.toLowerCase() || "pending";
  const allowedTransitions = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/orders" className="text-sm font-semibold text-[#9B4F5E] hover:underline">
          ← Back to Orders
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
        >
          <FaPrint className="h-3.5 w-3.5" />
          Print Packing Slip
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Placed on {new Date(order.placedAt || order.createdAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{order.orderNumber}</h1>
            <p className="mt-1 text-xs text-gray-500">
              Payment: <span className="font-semibold uppercase text-gray-700 dark:text-gray-300">{order.paymentMethod === "none" ? "Cash on Delivery" : order.paymentMethod}</span> ({order.paymentStatus})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${statusColors[currentStatus] || "bg-gray-100 text-gray-700"}`}>
              {labels[currentStatus] || currentStatus}
            </span>

            {/* Allowed State Transition Action Buttons */}
            {allowedTransitions.map((nextStatus) => {
              const isCancelOrReturn = ["cancelled", "returned"].includes(nextStatus);
              return (
                <button
                  key={nextStatus}
                  onClick={() => setTransitionDialog({ open: true, targetStatus: nextStatus, note: "" })}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-xs ${
                    isCancelOrReturn
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-[#9B4F5E] text-white hover:bg-[#843F4E]"
                  }`}
                >
                  {nextStatus === "confirmed" && "✓ Confirm Order"}
                  {nextStatus === "processing" && "⚙ Start Processing"}
                  {nextStatus === "shipped" && "🚚 Mark Shipped"}
                  {nextStatus === "delivered" && "✓ Mark Delivered"}
                  {nextStatus === "cancelled" && "✕ Cancel Order"}
                  {nextStatus === "returned" && "↩ Mark Returned"}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Order Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Customer, Delivery, and Courier Form (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer & Address Details */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Customer Information</h2>
              {order.customer ? (
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{order.customer.name}</p>
                  <p>{order.customer.phone || "No phone registered"}</p>
                  <p>{order.customer.email || "No email"}</p>
                  {order.customer.id && (
                    <Link
                      href={`/admin/customers/${order.customer.id}`}
                      className="mt-3 inline-block text-xs font-semibold text-[#9B4F5E] hover:underline"
                    >
                      View Customer Profile →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Guest Customer</p>
              )}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Delivery Address</h2>
              {order.shipping?.recipientName || order.address?.recipientName ? (
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {order.shipping?.recipientName || order.address?.recipientName}
                  </p>
                  <p>{order.shipping?.phone || order.address?.phone}</p>
                  <p className="leading-relaxed">
                    {order.shipping?.streetAddress || order.address?.streetAddress},{" "}
                    {order.shipping?.area || order.address?.area},{" "}
                    {order.shipping?.district || order.address?.district}
                    {(order.shipping?.postalCode || order.address?.postalCode) ? ` - ${order.shipping?.postalCode || order.address?.postalCode}` : ""}
                  </p>
                  {order.customerNote && (
                    <div className="mt-3 rounded-xl bg-amber-50/70 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <span className="font-semibold block mb-0.5">Customer Delivery Instruction:</span>
                      {order.customerNote}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No delivery address saved.</p>
              )}
            </section>
          </div>

          {/* Ordered Products Table */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Ordered Products ({order.items?.length || 0})</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {order.items?.map((item) => (
                <div key={`${item.productId}-${item.sku}`} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <FaBox className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      SKU: <span className="font-mono">{item.sku || "N/A"}</span> · Qty: <strong className="text-gray-800 dark:text-gray-200">{item.quantity}</strong> · Unit: {money(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{money(item.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Financials & Audit Status History (1 col) */}
        <div className="space-y-6">
          {/* Order Financial Summary */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Payment & Totals</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Product Subtotal</span>
                <span>{money(order.productSubtotal || order.subtotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts</span>
                  <span>-{money(order.discountTotal)}</span>
                </div>
              )}
              {order.couponCode && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Coupon ({order.couponCode})</span>
                  <span>-{money(order.couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery Charge</span>
                <span>{money(order.shippingFee || order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-gray-100">
                <span>Total Amount</span>
                <span className="text-[#9B4F5E]">{money(order.grandTotal || order.totalAmount)}</span>
              </div>
            </div>
          </section>

          {/* Fulfillment Status History */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Fulfillment Audit Timeline</h2>
            {order.statusHistory?.length ? (
              <ol className="relative ml-2 space-y-4 border-l border-gray-200 dark:border-gray-700">
                {order.statusHistory.map((entry) => (
                  <li key={entry.id} className="relative pl-5">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-white bg-[#9B4F5E] dark:border-gray-900" />
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {entry.fromStatus ? `${labels[entry.fromStatus] || entry.fromStatus} → ` : ""}
                      <span className="text-[#9B4F5E] capitalize">{labels[entry.toStatus] || entry.toStatus}</span>
                    </p>
                    {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}
                      {entry.actorName ? ` · ${entry.actorName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-gray-500">No status transitions recorded yet.</p>
            )}
          </section>
        </div>
      </div>

      {/* Transition Confirmation Modal */}
      {transitionDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirm Status Change: {labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Transition order <strong>{order.orderNumber}</strong> from <strong>{labels[currentStatus] || currentStatus}</strong> to <strong>{labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}</strong>.
              {["cancelled", "returned"].includes(transitionDialog.targetStatus) && (
                <span className="block mt-1 font-semibold text-red-600 dark:text-red-400">
                  Note: This will atomically restore all items back to product inventory.
                </span>
              )}
            </p>

            <form onSubmit={handleExecuteTransition} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Status Change Note (Optional)
                </label>
                <textarea
                  value={transitionDialog.note}
                  onChange={(e) => setTransitionDialog({ ...transitionDialog, note: e.target.value })}
                  placeholder="e.g. Verified by phone call, customer confirmed delivery address / Dispatched package..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTransitionDialog({ open: false, targetStatus: "", note: "" })}
                  disabled={isUpdating}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                    ["cancelled", "returned"].includes(transitionDialog.targetStatus)
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#9B4F5E] hover:bg-[#843F4E]"
                  }`}
                >
                  {isUpdating ? "Updating..." : `Confirm Transition to ${labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

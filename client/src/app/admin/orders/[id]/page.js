"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { FaBox, FaPrint, FaPlus, FaTrash, FaEdit, FaCoins, FaExclamationTriangle, FaCheck } from "react-icons/fa";
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

  // Item cost input state: { [itemId]: stringValue }
  const [itemCostInputs, setItemCostInputs] = useState({});
  const [isSavingCosts, setIsSavingCosts] = useState(false);
  const [costSaveSuccess, setCostSaveSuccess] = useState(false);

  // Other costs modal & state
  const [costHeaders, setCostHeaders] = useState([]);
  const [otherCostModal, setOtherCostModal] = useState({
    open: false,
    mode: "create", // "create" | "edit"
    costId: null,
    header: "",
    amount: "",
    note: "",
  });
  const [isSavingOtherCost, setIsSavingOtherCost] = useState(false);
  const [deleteCostDialog, setDeleteCostDialog] = useState({
    open: false,
    costId: null,
    header: "",
    amount: 0,
  });

  // Status transition dialog state
  const [transitionDialog, setTransitionDialog] = useState({ open: false, targetStatus: "", note: "" });

  const loadOrder = async () => {
    try {
      const result = await adminOrderService.getById(id);
      setOrder(result);
      // Sync item cost inputs from database
      const initialCosts = {};
      result.items?.forEach((it) => {
        initialCosts[it.id] = it.costPrice !== null && it.costPrice !== undefined ? String(it.costPrice) : "";
      });
      setItemCostInputs(initialCosts);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const loadHeaders = async () => {
    try {
      const headers = await adminOrderService.getCostHeaders();
      setCostHeaders(headers || []);
    } catch (e) {
      console.warn("Failed to load cost headers:", e.message);
    }
  };

  useEffect(() => {
    loadOrder();
    loadHeaders();
  }, [id]);

  // Handle saving item costs in batch
  const handleSaveItemCosts = async (e) => {
    e.preventDefault();
    setIsSavingCosts(true);
    setError("");
    setCostSaveSuccess(false);
    try {
      const payload = Object.entries(itemCostInputs).map(([itemId, val]) => ({
        id: itemId,
        costPrice: val.trim() === "" ? null : Number(val),
      }));
      const updated = await adminOrderService.updateItemCosts(id, payload);
      setOrder(updated);
      setCostSaveSuccess(true);
      setTimeout(() => setCostSaveSuccess(false), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingCosts(false);
    }
  };

  // Check if cost inputs have unpersisted changes
  const hasCostChanges = useMemo(() => {
    if (!order?.items) return false;
    return order.items.some((it) => {
      const currentInput = (itemCostInputs[it.id] || "").trim();
      const saved = it.costPrice !== null && it.costPrice !== undefined ? String(it.costPrice) : "";
      return currentInput !== saved;
    });
  }, [order, itemCostInputs]);

  // Handle save/update other cost
  const handleSaveOtherCost = async (e) => {
    e.preventDefault();
    setIsSavingOtherCost(true);
    setError("");
    try {
      const payload = {
        header: otherCostModal.header.trim(),
        amount: Number(otherCostModal.amount),
        note: otherCostModal.note.trim() || null,
      };

      let updated;
      if (otherCostModal.mode === "create") {
        updated = await adminOrderService.addOtherCost(id, payload);
      } else {
        updated = await adminOrderService.updateOtherCost(id, otherCostModal.costId, payload);
      }

      setOrder(updated);
      setOtherCostModal({ open: false, mode: "create", costId: null, header: "", amount: "", note: "" });
      loadHeaders();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingOtherCost(false);
    }
  };

  // Handle delete other cost
  const handleDeleteOtherCost = async () => {
    if (!deleteCostDialog.costId) return;
    setIsUpdating(true);
    setError("");
    try {
      const updated = await adminOrderService.deleteOtherCost(id, deleteCostDialog.costId);
      setOrder(updated);
      setDeleteCostDialog({ open: false, costId: null, header: "", amount: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

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
  const profitSummary = order.profitSummary || {};

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
            {/* Fulfillment Status */}
            <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${statusColors[currentStatus] || "bg-gray-100 text-gray-700"}`}>
              {labels[currentStatus] || currentStatus}
            </span>

            {/* Cost Status Badge */}
            {profitSummary.hasPendingCosts ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Cost Pending ({profitSummary.pendingCostCount} items)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Costs Complete
              </span>
            )}

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
        {/* Left Column: Customer, Delivery, Cost Table & Other Costs (2 cols) */}
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

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION: Item Sourcing Costs & Unit Profit                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FaCoins className="text-[#9B4F5E]" />
                  Item Costs & Profit Management ({order.items?.length || 0})
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter actual sourcing cost for each item to compute live unit gross profit.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {costSaveSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 animate-fade-in">
                    <FaCheck className="h-3 w-3" /> Costs Saved!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveItemCosts}
                  disabled={isSavingCosts || !hasCostChanges}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-xs ${
                    hasCostChanges
                      ? "bg-[#9B4F5E] hover:bg-[#843F4E] ring-2 ring-[#9B4F5E]/30"
                      : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isSavingCosts ? "Saving..." : hasCostChanges ? "Save Costs" : "Costs Saved"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 uppercase text-gray-500 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                  <tr>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-right">Selling Price</th>
                    <th className="px-3 py-3 min-w-[140px]">Cost Price (৳)</th>
                    <th className="px-3 py-3 text-right">Unit Profit</th>
                    <th className="px-3 py-3 text-right">Total Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items?.map((item) => {
                    const rawInput = itemCostInputs[item.id] ?? "";
                    const hasCost = rawInput.trim() !== "";
                    const enteredCost = hasCost ? Number(rawInput) : null;
                    const isLoss = enteredCost !== null && enteredCost > item.unitPrice;
                    const unitProfit = enteredCost !== null ? item.unitPrice - enteredCost : null;
                    const lineProfit = unitProfit !== null ? unitProfit * item.quantity : null;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        {/* Product Info */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                              {item.imageUrl ? (
                                <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <FaBox className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                {item.productName}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                SKU: {item.sku || "N/A"}
                              </p>
                              {item.costEnteredAt && (
                                <p className="text-[10px] text-gray-400">
                                  Saved: {new Date(item.costEnteredAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                                  {item.costEnteredByName ? ` by ${item.costEnteredByName}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-3 text-center font-bold text-gray-800 dark:text-gray-200">
                          {item.quantity}
                        </td>

                        {/* Selling Price */}
                        <td className="px-3 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          {money(item.unitPrice)}
                        </td>

                        {/* Editable Cost Price Input */}
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <div className="relative">
                              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">৳</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rawInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItemCostInputs((prev) => ({ ...prev, [item.id]: val }));
                                }}
                                placeholder="0.00"
                                className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs font-semibold transition-colors dark:bg-gray-800 ${
                                  isLoss
                                    ? "border-red-400 bg-red-50/50 text-red-900 dark:border-red-600 dark:text-red-300"
                                    : hasCost
                                    ? "border-emerald-300 bg-emerald-50/30 text-emerald-900 dark:border-emerald-700 dark:text-emerald-300"
                                    : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700"
                                }`}
                              />
                            </div>
                            {isLoss && (
                              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                <FaExclamationTriangle className="h-2.5 w-2.5 shrink-0" />
                                Loss: ৳{(enteredCost - item.unitPrice).toFixed(2)}/unit
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Unit Profit */}
                        <td className="px-3 py-3 text-right font-semibold">
                          {unitProfit !== null ? (
                            <span className={unitProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {unitProfit >= 0 ? "+" : ""}{money(unitProfit)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic font-normal">Pending</span>
                          )}
                        </td>

                        {/* Total Line Profit */}
                        <td className="px-3 py-3 text-right font-bold">
                          {lineProfit !== null ? (
                            <span className={lineProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {lineProfit >= 0 ? "+" : ""}{money(lineProfit)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic font-normal">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION: Other Operational Costs (Delivery, Packaging, etc.)   */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Other Operational Expenses
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {order.otherCosts?.length || 0}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Packaging, courier fees, duties, or other order-specific overhead costs.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOtherCostModal({
                    open: true,
                    mode: "create",
                    costId: null,
                    header: "",
                    amount: "",
                    note: "",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#9B4F5E] bg-[#FBF0F0] px-3.5 py-1.5 text-xs font-bold text-[#9B4F5E] transition-colors hover:bg-[#F3E5E5] dark:border-[#A46377] dark:bg-[#3b2430] dark:text-pink-200 shadow-xs"
              >
                <FaPlus className="h-3 w-3" />
                Add Expense
              </button>
            </div>

            {order.otherCosts?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 uppercase text-gray-500 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                    <tr>
                      <th className="px-3 py-3">Expense Header</th>
                      <th className="px-3 py-3 text-right">Amount (৳)</th>
                      <th className="px-3 py-3">Note</th>
                      <th className="px-3 py-3">Recorded</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {order.otherCosts.map((cost) => (
                      <tr key={cost.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">
                          {cost.header}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                          {money(cost.amount)}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                          {cost.note || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-gray-500">
                          <div>{new Date(cost.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</div>
                          <div className="text-gray-400">{cost.createdByName || "Admin"}</div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOtherCostModal({
                                  open: true,
                                  mode: "edit",
                                  costId: cost.id,
                                  header: cost.header,
                                  amount: String(cost.amount),
                                  note: cost.note || "",
                                })
                              }
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                              title="Edit expense"
                            >
                              <FaEdit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteCostDialog({
                                  open: true,
                                  costId: cost.id,
                                  header: cost.header,
                                  amount: cost.amount,
                                })
                              }
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                              title="Delete expense"
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500 dark:border-gray-800">
                No additional operational expenses recorded. Click &quot;Add Expense&quot; above to log packaging, delivery partner fees, or duties.
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Financials, Net Profit Card & Timeline (1 col) */}
        <div className="space-y-6">
          {/* Order Customer Payment & Totals */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Customer Bill Breakdown</h2>
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
                <span>Customer Delivery Fee</span>
                <span>{money(order.shippingFee || order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-gray-100">
                <span>Total Collected</span>
                <span className="text-[#9B4F5E]">{money(order.grandTotal || order.totalAmount)}</span>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION: Live Net Profit & Margin Card                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between">
              <span>Order Net Profit</span>
              <span className="text-xs font-normal text-gray-400">Admin Only</span>
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Selling Revenue</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{money(profitSummary.totalSellingAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Sourcing Cost</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {profitSummary.totalItemCost > 0 ? `-${money(profitSummary.totalItemCost)}` : "৳0"}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Other Operating Costs</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {profitSummary.totalOtherCost > 0 ? `-${money(profitSummary.totalOtherCost)}` : "৳0"}
                </span>
              </div>

              {/* Net Profit Summary Row */}
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Real Net Profit
                    </span>
                    {profitSummary.netMarginPercentage !== null && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Margin: <strong className={profitSummary.netMarginPercentage >= 0 ? "text-emerald-600" : "text-red-600"}>{profitSummary.netMarginPercentage}%</strong>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {profitSummary.netProfit !== null ? (
                      <span className={`text-xl font-extrabold ${profitSummary.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {profitSummary.netProfit >= 0 ? "+" : ""}{money(profitSummary.netProfit)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold italic text-amber-600 dark:text-amber-400">
                        Cost Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Loss or Pending Warning */}
                {profitSummary.netProfit !== null && profitSummary.netProfit < 0 && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <FaExclamationTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>This order results in an overall net financial loss.</span>
                  </div>
                )}
                {profitSummary.hasPendingCosts && (
                  <div className="mt-3 rounded-xl bg-amber-50/70 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    ⚠️ <strong>Partial Calculation:</strong> {profitSummary.pendingCostCount} item(s) have no cost recorded. Profit shown reflects only items with entered costs.
                  </div>
                )}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Add / Edit Other Operational Cost                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {otherCostModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="shrink-0 p-6 pb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {otherCostModal.mode === "create" ? "Add Operating Expense" : "Edit Operating Expense"}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Record extra order expenses like courier charges, packaging boxes, or customs.
              </p>
            </div>

            <form onSubmit={handleSaveOtherCost} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Expense Header <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="cost-headers-list"
                    maxLength={100}
                    value={otherCostModal.header}
                    onChange={(e) => setOtherCostModal({ ...otherCostModal, header: e.target.value })}
                    placeholder="e.g. Delivery Charge, Packaging Material..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <datalist id="cost-headers-list">
                    {costHeaders.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Type a new header or select an existing suggested header.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={otherCostModal.amount}
                    onChange={(e) => setOtherCostModal({ ...otherCostModal, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Note / Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={otherCostModal.note}
                    onChange={(e) => setOtherCostModal({ ...otherCostModal, note: e.target.value })}
                    placeholder="e.g. Pathao consignment #123, fragile bubble wrap"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 p-6 pt-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() =>
                    setOtherCostModal({ open: false, mode: "create", costId: null, header: "", amount: "", note: "" })
                  }
                  disabled={isSavingOtherCost}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOtherCost}
                  className="rounded-xl bg-[#9B4F5E] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#843F4E] disabled:opacity-50"
                >
                  {isSavingOtherCost ? "Saving..." : otherCostModal.mode === "create" ? "Add Expense" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Delete Other Cost Confirmation                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {deleteCostDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Delete Operating Expense
            </h3>
            <p className="mt-2 text-xs text-gray-500">
              Are you sure you want to delete <strong>{deleteCostDialog.header}</strong> ({money(deleteCostDialog.amount)})? This will update the order&apos;s net profit calculations.
            </p>
            <div className="mt-5 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteCostDialog({ open: false, costId: null, header: "", amount: 0 })}
                disabled={isUpdating}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOtherCost}
                disabled={isUpdating}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isUpdating ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: Transition Confirmation Modal                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {transitionDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="shrink-0 p-6 pb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Confirm Status Change: {labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Transition order <strong>{order.orderNumber}</strong> from <strong>{labels[currentStatus] || currentStatus}</strong> to <strong>{labels[transitionDialog.targetStatus] || transitionDialog.targetStatus}</strong>.
                {["cancelled", "returned"].includes(transitionDialog.targetStatus) && (
                  <span className="block mt-1 font-semibold text-red-600 dark:text-red-400">
                    Note: This will atomically restore all items back to product inventory.
                  </span>
                )}
              </p>

              {/* Status Rule Advisory for Pending Costs */}
              {["delivered", "shipped"].includes(transitionDialog.targetStatus) && profitSummary.hasPendingCosts && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <FaExclamationTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                    Pending Item Sourcing Costs
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    This order still has {profitSummary.pendingCostCount} item(s) without cost prices. You can proceed with {labels[transitionDialog.targetStatus]}, but we recommend recording item costs so profit analytics remain accurate.
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteTransition} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
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
              </div>

              {/* Pinned Modal Footer */}
              <div className="shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 p-6 pt-3 dark:border-gray-800">
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

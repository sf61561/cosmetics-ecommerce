"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaBox,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaEye,
  FaMoneyBillWave,
  FaRedo,
  FaShippingFast,
  FaTimesCircle,
  FaTruck,
  FaUndo,
  FaUser,
  FaWarehouse,
} from "react-icons/fa";
import { adminReturnService } from "@/services/adminReturnService";

const money = (val) => `৳${Number(val || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const returnStatusBadges = {
  REQUESTED: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  INFO_NEEDED: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 animate-pulse",
  APPROVED: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  REJECTED: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  PICKUP_SCHEDULED: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
  IN_TRANSIT: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  RECEIVED: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
  INSPECTED: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
  REFUNDED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  EXCHANGED: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200",
};

const reasonLabels = {
  DEFECTIVE_DAMAGED: "Defective or Damaged Item",
  WRONG_ITEM: "Wrong Item Delivered",
  NOT_AS_DESCRIBED: "Item Not as Described",
  SIZE_FIT_ISSUE: "Size / Fit Issue",
  CHANGED_MIND: "Changed Mind",
  LATE_DELIVERY: "Late Delivery",
};

export default function AdminReturnDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [returnData, setReturnData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightbox
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Status Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoPrompt, setInfoPrompt] = useState("");

  // Inspection form state
  const [itemConditions, setItemConditions] = useState({});
  const [adminInspectionNote, setAdminInspectionNote] = useState("");
  const [inspectionPhotos, setInspectionPhotos] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({
    refundMethod: "MFS",
    trxId: "",
    bankRef: "",
    voucherNo: "",
    returnShippingFee: 0,
    returnShippingPayer: "STORE",
    adminNote: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await adminReturnService.getById(id);
      setReturnData(data);

      // Initialize conditions for inspection
      if (Array.isArray(data.items)) {
        const initConditions = {};
        data.items.forEach((item) => {
          initConditions[item.id] = {
            condition: item.item_condition || "RESELLABLE",
            costRecoveredAmount:
              item.cost_recovered_amount !== null
                ? Number(item.cost_recovered_amount)
                : Number(item.unit_cost_price || 0) * item.quantity,
          };
        });
        setItemConditions(initConditions);
      }

      setAdminInspectionNote(data.admin_note || "");

      // Setup default refund form
      setRefundForm((prev) => ({
        ...prev,
        refundMethod: data.refund_method || "MFS",
        returnShippingFee: Number(data.return_shipping_fee || 0),
        returnShippingPayer: data.return_shipping_payer || "STORE",
      }));
    } catch (err) {
      setError(err.message || "Failed to load return details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle simple status updates (e.g. Approve, Pickup, In Transit, Received, Completed)
  const handleUpdateStatus = async (newStatus, payload = {}) => {
    setIsSubmitting(true);
    setError("");
    setActionSuccess("");
    try {
      await adminReturnService.updateStatus(id, newStatus, payload);
      setActionSuccess(`Status transitioned to ${newStatus}.`);
      setRejectModalOpen(false);
      setRejectionReason("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request more photos
  const handleRequestPhotos = async () => {
    if (!infoPrompt.trim()) {
      setError("Please describe what additional photos or details are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await adminReturnService.requestPhotos(id, infoPrompt);
      setActionSuccess("Additional photos requested from customer.");
      setInfoModalOpen(false);
      setInfoPrompt("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to request photos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inspection photo upload
  const handleInspectionPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setError("");
    try {
      const res = await adminReturnService.uploadInspectionPhoto(file, id);
      setInspectionPhotos((prev) => [
        ...prev,
        {
          image_url: res.imageUrl,
          public_id: res.publicId,
          uploader_type: "ADMIN",
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to upload inspection photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save warehouse inspection
  const handleSaveInspection = async () => {
    setIsSubmitting(true);
    setError("");
    setActionSuccess("");
    try {
      const formattedConditions = Object.entries(itemConditions).map(([itemId, val]) => ({
        returnItemId: itemId,
        condition: val.condition,
        costRecoveredAmount: Number(val.costRecoveredAmount || 0),
      }));

      await adminReturnService.saveInspection(id, {
        itemConditions: formattedConditions,
        adminNote: adminInspectionNote,
        inspectionImages: inspectionPhotos,
      });

      setActionSuccess("Warehouse inspection saved successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save inspection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process refund submission
  const handleProcessRefund = async () => {
    setIsSubmitting(true);
    setError("");
    setActionSuccess("");
    try {
      let details = { ...(returnData?.refund_account_details || {}) };
      if (refundForm.refundMethod === "MFS") {
        if (!refundForm.trxId.trim()) {
          throw new Error("Please enter the MFS Transaction ID (TrxID) for proof of refund.");
        }
        details.trx_id = refundForm.trxId.trim();
      } else if (refundForm.refundMethod === "BANK") {
        if (!refundForm.bankRef.trim()) {
          throw new Error("Please enter the Bank Transfer Reference for proof of refund.");
        }
        details.bank_reference = refundForm.bankRef.trim();
      } else if (refundForm.refundMethod === "CASH") {
        if (!refundForm.voucherNo.trim()) {
          throw new Error("Please enter the Cash Voucher or Receipt Number.");
        }
        details.voucher_no = refundForm.voucherNo.trim();
      }

      await adminReturnService.processRefund(id, {
        refundMethod: refundForm.refundMethod,
        refundAccountDetails: details,
        returnShippingFee: Number(refundForm.returnShippingFee || 0),
        returnShippingPayer: refundForm.returnShippingPayer,
        adminNote: refundForm.adminNote,
      });

      setActionSuccess("Refund processed and return marked as REFUNDED.");
      setRefundModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to process refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
          Loading return claim...
        </div>
      </div>
    );
  }

  if (error && !returnData) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/admin/returns")}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
          >
            Back to Returns Directory
          </button>
        </div>
      </div>
    );
  }

  const { status, refund_amount, return_shipping_fee, return_shipping_payer } = returnData;
  const isRequested = status === "REQUESTED";
  const isInfoNeeded = status === "INFO_NEEDED";
  const isApproved = status === "APPROVED";
  const isPickupScheduled = status === "PICKUP_SCHEDULED";
  const isInTransit = status === "IN_TRANSIT";
  const isReceived = status === "RECEIVED";
  const isInspected = status === "INSPECTED";
  const isRefunded = status === "REFUNDED";
  const isCompleted = status === "COMPLETED";
  const isRejected = status === "REJECTED";

  const customerPhotos = returnData.images?.filter((img) => img.uploader_type === "CUSTOMER") || [];
  const adminPhotos = returnData.images?.filter((img) => img.uploader_type === "ADMIN") || [];

  const totalSourcingCost =
    returnData.items?.reduce(
      (sum, it) => sum + Number(it.unit_cost_price || 0) * Number(it.quantity || 0),
      0
    ) || 0;

  const totalSellingAmount =
    returnData.items?.reduce(
      (sum, it) => sum + Number(it.unit_selling_price || 0) * Number(it.quantity || 0),
      0
    ) || 0;

  // Calculation for refund modal
  const shippingDeduction =
    refundForm.returnShippingPayer === "CUSTOMER" ? Number(refundForm.returnShippingFee || 0) : 0;
  const finalRefundAmount = Math.max(0, Number(refund_amount || 0) - shippingDeduction);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/returns"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-2xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
          >
            <FaArrowLeft className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                {returnData.return_number}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                  returnStatusBadges[status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Requested by <span className="font-semibold text-gray-700 dark:text-gray-300">{returnData.customer?.name}</span> on{" "}
              {new Date(returnData.requested_at || returnData.created_at).toLocaleString("en-BD", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        {/* Dynamic Action Buttons according to Lifecycle */}
        <div className="flex flex-wrap items-center gap-2">
          {(isRequested || isInfoNeeded) && (
            <>
              <button
                type="button"
                onClick={() => setInfoModalOpen(true)}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                Request More Photos
              </button>
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={isSubmitting}
                className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                Reject Return
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("APPROVED")}
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve Return
              </button>
            </>
          )}

          {isApproved && (
            <>
              <button
                type="button"
                onClick={() => handleUpdateStatus("PICKUP_SCHEDULED")}
                disabled={isSubmitting}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <FaShippingFast className="inline mr-1" /> Schedule Pickup
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("IN_TRANSIT")}
                disabled={isSubmitting}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700"
              >
                <FaTruck className="inline mr-1" /> Mark In Transit
              </button>
            </>
          )}

          {isPickupScheduled && (
            <button
              type="button"
              onClick={() => handleUpdateStatus("IN_TRANSIT")}
              disabled={isSubmitting}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700"
            >
              <FaTruck className="inline mr-1" /> Courier Picked Up (In Transit)
            </button>
          )}

          {isInTransit && (
            <button
              type="button"
              onClick={() => handleUpdateStatus("RECEIVED")}
              disabled={isSubmitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-teal-700"
            >
              <FaWarehouse className="inline mr-1" /> Mark Package Received at Hub
            </button>
          )}

          {isInspected && (
            <button
              type="button"
              onClick={() => setRefundModalOpen(true)}
              disabled={isSubmitting}
              className="rounded-xl bg-[#9B4F5E] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#864351]"
            >
              <FaMoneyBillWave className="inline mr-1" /> Process Refund Disbursement
            </button>
          )}

          {isRefunded && (
            <button
              type="button"
              onClick={() => handleUpdateStatus("COMPLETED")}
              disabled={isSubmitting}
              className="rounded-xl bg-gray-800 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-black dark:bg-gray-700"
            >
              <FaCheckCircle className="inline mr-1" /> Close & Mark Completed
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Items, Evidence, Warehouse Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Reason & Customer Note */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Claim Reason & Statements
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 rounded-2xl bg-gray-50/70 p-4 dark:bg-gray-850">
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Return Reason</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                  {reasonLabels[returnData.reason] || returnData.reason}
                </p>
                {returnData.is_window_overridden && (
                  <span className="mt-1.5 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Policy 7-Day Window Overridden by Admin
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Customer Note</p>
                <p className="mt-0.5 text-xs italic text-gray-700 dark:text-gray-300">
                  {returnData.customer_note ? `"${returnData.customer_note}"` : "No note provided."}
                </p>
              </div>
            </div>

            {returnData.rejection_reason && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <span className="font-bold">Rejection Reason: </span>
                {returnData.rejection_reason}
              </div>
            )}

            {returnData.info_needed_prompt && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="font-bold">Photos/Info Prompt Sent to Customer: </span>
                {returnData.info_needed_prompt}
              </div>
            )}
          </div>

          {/* Returned Items Table */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Claim Items ({returnData.items?.length || 0})
            </h3>
            <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden dark:divide-gray-800 dark:border-gray-800">
              {returnData.items?.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="h-12 w-12 rounded-xl border border-gray-200 object-cover shrink-0 dark:border-gray-700"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 shrink-0 dark:bg-gray-800">
                        <FaBox />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className="text-[11px] text-gray-500">{item.variant_name}</p>
                      )}
                      <p className="text-[11px] font-mono text-gray-400">SKU: {item.sku || "N/A"}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      Qty: {item.quantity} × {money(item.unit_selling_price)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Sourcing Cost: {money(item.unit_cost_price)}/unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Evidence Photos Gallery */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Customer Evidence Photos ({customerPhotos.length})
              </h3>
              <span className="text-[11px] text-gray-400">Click photo to zoom</span>
            </div>
            {customerPhotos.length === 0 ? (
              <p className="mt-3 text-xs italic text-gray-400">No customer photos attached.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {customerPhotos.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedPhoto(img.image_url)}
                    className="group relative h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 focus:outline-hidden dark:border-gray-700 shadow-2xs"
                  >
                    <img
                      src={img.image_url}
                      alt="Customer proof"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                      🔍
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Inspection Panel (Active when Received, Inspected, or Completed) */}
          <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-2xs dark:border-teal-900 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FaWarehouse className="text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Warehouse Physical Inspection
                </h3>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  returnData.received_at ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {returnData.received_at ? "Received at Warehouse" : "Awaiting Package Arrival"}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Inspect each received item&apos;s physical condition. Specifying <strong>Resellable</strong> reverses the sourcing cost (zero loss). Specifying <strong>Damaged</strong> logs the sourcing cost as a business loss.
              </p>

              {/* Items Condition Inputs */}
              <div className="space-y-3">
                {returnData.items?.map((item) => {
                  const currCond = itemConditions[item.id] || {
                    condition: item.item_condition || "RESELLABLE",
                    costRecoveredAmount: Number(item.unit_cost_price || 0) * item.quantity,
                  };

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-850"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {item.product_name} (Qty: {item.quantity})
                        </p>
                        <span className="text-[11px] text-gray-500">
                          Unit Cost: {money(item.unit_cost_price)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                            Condition
                          </label>
                          <select
                            value={currCond.condition}
                            disabled={isCompleted || isRefunded}
                            onChange={(e) => {
                              const newCond = e.target.value;
                              let newRecovery = 0;
                              if (newCond === "RESELLABLE") {
                                newRecovery = Number(item.unit_cost_price || 0) * item.quantity;
                              }
                              setItemConditions((prev) => ({
                                ...prev,
                                [item.id]: {
                                  condition: newCond,
                                  costRecoveredAmount: newRecovery,
                                },
                              }));
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                          >
                            <option value="RESELLABLE">Resellable (Cost Recovered)</option>
                            <option value="DAMAGED">Damaged / Broken (Unrecovered Loss)</option>
                            <option value="WRONG_ITEM">Wrong Item</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                            Cost Recovered (৳)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currCond.costRecoveredAmount}
                            disabled={isCompleted || isRefunded}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemConditions((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  costRecoveredAmount: val,
                                },
                              }));
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inspection Photos Upload & Preview */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">
                  Admin Inspection Photos
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {adminPhotos.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedPhoto(img.image_url)}
                      className="h-16 w-16 overflow-hidden rounded-xl border border-teal-200 shadow-2xs"
                    >
                      <img src={img.image_url} alt="Inspection" className="h-full w-full object-cover" />
                    </button>
                  ))}

                  {inspectionPhotos.map((img, i) => (
                    <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-teal-400">
                      <img src={img.image_url} alt="New Inspection" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setInspectionPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {!isCompleted && !isRefunded && (
                    <label className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 text-teal-700 cursor-pointer hover:bg-teal-50 transition">
                      <FaCamera className="text-sm" />
                      <span className="text-[9px] font-bold mt-1">Add Photo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploadingPhoto}
                        onChange={handleInspectionPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {isUploadingPhoto && (
                  <p className="mt-1 text-xs text-teal-600 animate-pulse">Uploading inspection photo...</p>
                )}
              </div>

              {/* Internal Admin Note */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                  Internal Inspection & Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={adminInspectionNote}
                  disabled={isCompleted || isRefunded}
                  onChange={(e) => setAdminInspectionNote(e.target.value)}
                  placeholder="Record package seal condition, warehouse shelf notes, or courier claims..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              {!isCompleted && !isRefunded && (
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={handleSaveInspection}
                    disabled={isSubmitting}
                    className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-teal-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Warehouse Inspection"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Customer Details, Financial Breakdown, Refund Info, Audit Timeline */}
        <div className="space-y-6">
          {/* Customer & Order Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Customer & Order Link
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <FaUser className="text-sm" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                    {returnData.customer?.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{returnData.customer?.email}</p>
                  <p className="text-[11px] text-gray-400">{returnData.customer?.phone || "No phone"}</p>
                </div>
              </div>

              <div className="border-t pt-3 dark:border-gray-800">
                <p className="text-[11px] text-gray-400">Parent Order</p>
                <Link
                  href={`/admin/orders?search=${returnData.order?.order_number || returnData.order_id}`}
                  className="font-mono text-xs font-bold text-[#9B4F5E] hover:underline"
                >
                  Order #{returnData.order?.order_number || returnData.order_id?.slice(0, 8)}
                </Link>
                <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                  <span>Order Total:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {money(returnData.order?.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Original Payment:</span>
                  <span className="font-semibold uppercase text-gray-800 dark:text-gray-200">
                    {returnData.order?.payment_method}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Impact Snapshot */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Financial Impact Analysis
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Returned Goods Value:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {money(totalSellingAmount)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Associated Cost (COGS):</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {money(totalSourcingCost)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Gross Profit at Risk:</span>
                <span className="font-semibold text-[#9B4F5E]">
                  {money(totalSellingAmount - totalSourcingCost)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-gray-900 dark:text-gray-100">
                <span>Refund Settlement:</span>
                <span className="text-[#9B4F5E]">{money(refund_amount)}</span>
              </div>
            </div>
          </div>

          {/* Refund Settlement Details Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Refund Disbursement Details
              </h3>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {returnData.refund_method}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {returnData.refund_method === "MFS" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provider:</span>
                    <span className="font-bold uppercase text-gray-800 dark:text-gray-200">
                      {returnData.refund_account_details?.provider}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Wallet Number:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {returnData.refund_account_details?.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Type:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {returnData.refund_account_details?.account_type || "Personal"}
                    </span>
                  </div>
                  {returnData.refund_account_details?.trx_id && (
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-emerald-700 font-bold">Admin TrxID:</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {returnData.refund_account_details?.trx_id}
                      </span>
                    </div>
                  )}
                </>
              )}

              {returnData.refund_method === "BANK" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank Name:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {returnData.refund_account_details?.bank_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {returnData.refund_account_details?.account_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account No:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                      {returnData.refund_account_details?.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Branch / Routing:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {returnData.refund_account_details?.branch_name || "N/A"}
                    </span>
                  </div>
                  {returnData.refund_account_details?.bank_reference && (
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-emerald-700 font-bold">Transfer Ref:</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {returnData.refund_account_details?.bank_reference}
                      </span>
                    </div>
                  )}
                </>
              )}

              {returnData.refund_method === "CASH" && (
                <>
                  <p className="text-gray-500">In-person office/showroom cash refund.</p>
                  {returnData.refund_account_details?.voucher_no && (
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-emerald-700 font-bold">Receipt / Voucher:</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {returnData.refund_account_details?.voucher_no}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Lifecycle Audit Timeline
            </h3>
            <div className="mt-4 space-y-4">
              {returnData.history?.map((step) => (
                <div key={step.id} className="relative pl-6 text-xs">
                  <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#9B4F5E]" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {step.new_status}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(step.created_at).toLocaleString("en-BD", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {step.note && <p className="mt-0.5 text-gray-500">{step.note}</p>}
                  <p className="text-[10px] text-gray-400">By: {step.user_name || "System"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal (Bounded to max-h-[85vh]) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
            <div className="shrink-0 border-b pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-red-600">Reject Return Request</h3>
              <p className="text-xs text-gray-500 mt-1">
                This rejection reason will be visible to the customer on their returns tracking page.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Products returned after the 7-day window with seals broken..."
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div className="shrink-0 border-t pt-4 flex justify-end gap-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("REJECTED", { rejectionReason })}
                disabled={!rejectionReason.trim() || isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Needed / Request Photos Modal (Bounded to max-h-[85vh]) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
            <div className="shrink-0 border-b pb-3 dark:border-gray-800">
              <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">
                Request Additional Photos / Details
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                The return status will be set to INFO_NEEDED and the customer will receive an alert to upload more photos.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Clarification Prompt for Customer *
              </label>
              <textarea
                rows={3}
                value={infoPrompt}
                onChange={(e) => setInfoPrompt(e.target.value)}
                placeholder="e.g. Please provide a clear close-up picture of the broken pump dispenser and the expiration batch code..."
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div className="shrink-0 border-t pt-4 flex justify-end gap-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestPhotos}
                disabled={!infoPrompt.trim() || isSubmitting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Request to Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal (Bounded to max-h-[85vh]) */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
            <div className="shrink-0 border-b pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FaMoneyBillWave className="text-[#9B4F5E]" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Process Refund Disbursement
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Settles customer refund and completes the return lifecycle.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Method confirmation */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Disbursement Method
                </label>
                <div className="flex gap-2">
                  {["MFS", "BANK", "CASH"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundForm((p) => ({ ...p, refundMethod: m }))}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition border ${
                        refundForm.refundMethod === m
                          ? "bg-[#9B4F5E] text-white border-[#9B4F5E]"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {m === "MFS" ? "bKash / Nagad" : m === "BANK" ? "Bank Wire" : "Cash"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Account Target Display */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 text-xs dark:border-gray-800 dark:bg-gray-850">
                <p className="font-bold text-gray-700 dark:text-gray-300">Customer Refund Target:</p>
                {refundForm.refundMethod === "MFS" && (
                  <p className="mt-1 font-mono text-gray-800 dark:text-gray-200">
                    {returnData.refund_account_details?.provider?.toUpperCase() || "MFS"} •{" "}
                    {returnData.refund_account_details?.account_number || "No number"} (
                    {returnData.refund_account_details?.account_type || "Personal"})
                  </p>
                )}
                {refundForm.refundMethod === "BANK" && (
                  <p className="mt-1 text-gray-800 dark:text-gray-200">
                    {returnData.refund_account_details?.bank_name} • Acct:{" "}
                    {returnData.refund_account_details?.account_number} • {returnData.refund_account_details?.account_name}
                  </p>
                )}
                {refundForm.refundMethod === "CASH" && (
                  <p className="mt-1 text-gray-800 dark:text-gray-200">In-person handoff at store counter.</p>
                )}
              </div>

              {/* Required Reference Input */}
              {refundForm.refundMethod === "MFS" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    MFS Transaction ID (TrxID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={refundForm.trxId}
                    onChange={(e) => setRefundForm((p) => ({ ...p, trxId: e.target.value }))}
                    placeholder="e.g. BL9A7K8J2"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              )}

              {refundForm.refundMethod === "BANK" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Bank Transfer Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={refundForm.bankRef}
                    onChange={(e) => setRefundForm((p) => ({ ...p, bankRef: e.target.value }))}
                    placeholder="e.g. BEFTN-20261114-8849"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              )}

              {refundForm.refundMethod === "CASH" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Receipt / Voucher # *
                  </label>
                  <input
                    type="text"
                    required
                    value={refundForm.voucherNo}
                    onChange={(e) => setRefundForm((p) => ({ ...p, voucherNo: e.target.value }))}
                    placeholder="e.g. VCH-00921"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              )}

              {/* Return Shipping Fee & Payer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Return Shipping Fee (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={refundForm.returnShippingFee}
                    onChange={(e) => setRefundForm((p) => ({ ...p, returnShippingFee: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Fee Payer
                  </label>
                  <select
                    value={refundForm.returnShippingPayer}
                    onChange={(e) => setRefundForm((p) => ({ ...p, returnShippingPayer: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="STORE">Store Absorbs (Default)</option>
                    <option value="CUSTOMER">Deduct from Customer Refund</option>
                  </select>
                </div>
              </div>

              {/* Refund Math Calculation Summary */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-1.5 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Gross Claim Refund:</span>
                  <span className="font-semibold">{money(refund_amount)}</span>
                </div>
                {refundForm.returnShippingPayer === "CUSTOMER" && Number(refundForm.returnShippingFee) > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Return Courier Deduction:</span>
                    <span>-{money(refundForm.returnShippingFee)}</span>
                  </div>
                )}
                <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-base text-emerald-900 dark:text-emerald-200">
                  <span>Final Net Disbursed:</span>
                  <span>{money(finalRefundAmount)}</span>
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Settlement Remark (Internal)
                </label>
                <textarea
                  rows={2}
                  value={refundForm.adminNote}
                  onChange={(e) => setRefundForm((p) => ({ ...p, adminNote: e.target.value }))}
                  placeholder="e.g. Disbursed via official bKash Merchant wallet..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="shrink-0 border-t pt-4 flex justify-end gap-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={isSubmitting}
                className="rounded-xl bg-[#9B4F5E] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#864351] disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : `Disburse ${money(finalRefundAmount)} & Complete`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedPhoto} alt="Full evidence view" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

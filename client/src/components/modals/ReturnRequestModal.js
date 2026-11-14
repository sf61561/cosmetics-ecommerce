"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  FaTimes,
  FaUpload,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBox,
  FaMoneyBillWave,
  FaMobileAlt,
  FaUniversity,
} from "react-icons/fa";
import { returnService } from "@/services/returnService";

const RETURN_REASONS = [
  { value: "DEFECTIVE_DAMAGED", label: "Defective or Damaged Item", photosRequired: true },
  { value: "WRONG_ITEM", label: "Wrong Item Delivered", photosRequired: true },
  { value: "NOT_AS_DESCRIBED", label: "Not as Described on Store", photosRequired: true },
  { value: "SIZE_FIT_ISSUE", label: "Size / Fit Issue", photosRequired: false },
  { value: "CHANGED_MIND", label: "Changed Mind", photosRequired: false },
  { value: "LATE_DELIVERY", label: "Delivered Too Late", photosRequired: false },
];

const MFS_PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay"];

const money = (val) => `৳${Number(val || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function ReturnRequestModal({ open, onClose, orderId, onSuccess }) {
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [eligibilityError, setEligibilityError] = useState("");

  // Selected items: { [orderItemId]: quantityToReturn }
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState("DEFECTIVE_DAMAGED");
  const [customerNote, setCustomerNote] = useState("");

  // Photos: [{ imageUrl, publicId, fileSize, mimeType, fileHash }]
  const [images, setImages] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Refund method & account details
  const [refundMethod, setRefundMethod] = useState("MFS"); // "MFS" | "BANK" | "CASH"
  const [mfsDetails, setMfsDetails] = useState({
    provider: "bKash",
    accountNumber: "",
    accountType: "Personal",
  });
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branchName: "",
    routingNumber: "",
  });
  const [cashDetails, setCashDetails] = useState({
    preferredLocation: "",
    note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch eligibility when modal opens
  useEffect(() => {
    if (!open || !orderId) return;

    let active = true;
    setLoadingEligibility(true);
    setEligibilityError("");

    async function load() {
      try {
        const data = await returnService.getOrderEligibility(orderId);
        if (active) {
          setEligibilityData(data);
          // Pre-select first returnable item
          const initial = {};
          const first = data.items?.find((i) => i.returnableQty > 0);
          if (first) initial[first.id] = 1;
          setSelectedItems(initial);
        }
      } catch (err) {
        if (active) setEligibilityError(err.message || "Failed to check order eligibility.");
      } finally {
        if (active) setLoadingEligibility(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [open, orderId]);

  if (!open) return null;

  const currentReasonObj = RETURN_REASONS.find((r) => r.value === reason) || RETURN_REASONS[0];
  const photosRequired = currentReasonObj.photosRequired;

  // Toggle item selection
  const handleToggleItem = (itemId, maxQty) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = Math.min(1, maxQty);
      }
      return copy;
    });
  };

  // Change quantity for item
  const handleQtyChange = (itemId, qty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: Number(qty),
    }));
  };

  // Upload photo handler
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      alert("You can upload a maximum of 5 photos per return request.");
      return;
    }

    setIsUploadingPhoto(true);
    setSubmitError("");
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5 MB limit.`);
        }
        const uploaded = await returnService.uploadEvidence(file);
        setImages((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setSubmitError(err.message || "Photo upload failed.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate total refund estimate
  const totalEstimatedRefund = Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
    const it = eligibilityData?.items?.find((i) => i.id === itemId);
    return sum + (it ? it.unitPrice * qty : 0);
  }, 0);

  // Submit Return Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const itemEntries = Object.entries(selectedItems);
    if (!itemEntries.length) {
      setSubmitError("Please select at least one item to return.");
      return;
    }

    if (photosRequired && images.length === 0) {
      setSubmitError(`Photo proof is mandatory for ${currentReasonObj.label}. Please attach at least 1 photo.`);
      return;
    }

    let refundAccountDetails = {};
    if (refundMethod === "MFS") {
      if (!mfsDetails.accountNumber.trim() || !/^01[3-9]\d{8}$/.test(mfsDetails.accountNumber.trim())) {
        setSubmitError("Please enter a valid 11-digit Bangladeshi mobile number for MFS refund.");
        return;
      }
      refundAccountDetails = {
        type: "MFS",
        provider: mfsDetails.provider,
        accountNumber: mfsDetails.accountNumber.trim(),
        accountType: mfsDetails.accountType,
      };
    } else if (refundMethod === "BANK") {
      if (!bankDetails.bankName.trim() || !bankDetails.accountName.trim() || !bankDetails.accountNumber.trim()) {
        setSubmitError("Please provide bank name, account holder name, and account number.");
        return;
      }
      refundAccountDetails = {
        type: "BANK",
        bankName: bankDetails.bankName.trim(),
        accountName: bankDetails.accountName.trim(),
        accountNumber: bankDetails.accountNumber.trim(),
        branchName: bankDetails.branchName.trim(),
        routingNumber: bankDetails.routingNumber.trim(),
      };
    } else {
      refundAccountDetails = {
        type: "CASH",
        preferredLocation: cashDetails.preferredLocation.trim() || "Main Office / Hub",
        note: cashDetails.note.trim() || "Handover upon inspection",
      };
    }

    const payload = {
      orderId,
      reason,
      customerNote: customerNote.trim(),
      refundMethod,
      refundAccountDetails,
      items: itemEntries.map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity,
      })),
      images,
    };

    setSubmitting(true);
    try {
      const created = await returnService.createReturn(payload);
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Pinned Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Request Return & Refund
            </h2>
            <p className="text-xs text-gray-500">
              {eligibilityData?.orderNumber ? `Order #${eligibilityData.orderNumber}` : "Select items to return"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {loadingEligibility ? (
              <p className="py-12 text-center text-sm text-gray-500">Checking return eligibility...</p>
            ) : eligibilityError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                {eligibilityError}
              </div>
            ) : !eligibilityData?.hasReturnableItems ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                All items from this order have already been returned or are not eligible.
              </div>
            ) : (
              <>
                {/* Step 1: Select Items */}
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                    1. Select Items to Return
                  </h3>
                  <div className="space-y-2.5">
                    {eligibilityData.items.map((item) => {
                      const isSelected = Boolean(selectedItems[item.id]);
                      const isReturnable = item.returnableQty > 0;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                            isSelected
                              ? "border-[#9B4F5E] bg-[#FBF0F0]/50 dark:border-pink-800 dark:bg-pink-950/20"
                              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                          } ${!isReturnable ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!isReturnable}
                            checked={isSelected}
                            onChange={() => handleToggleItem(item.id, item.returnableQty)}
                            className="h-4 w-4 rounded text-[#9B4F5E] focus:ring-[#9B4F5E]"
                          />
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <FaBox className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                              {item.productName}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Price: {money(item.unitPrice)} · Purchased: {item.quantity}
                              {item.alreadyReturnedQty > 0 && ` (${item.alreadyReturnedQty} already returned)`}
                            </p>
                          </div>

                          {/* Quantity Selector */}
                          {isSelected && (
                            <div className="shrink-0 flex items-center gap-1.5">
                              <label className="text-[11px] text-gray-500">Qty:</label>
                              <select
                                value={selectedItems[item.id] || 1}
                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                              >
                                {Array.from({ length: item.returnableQty }, (_, i) => i + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Step 2: Reason & Note */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    2. Return Reason & Explanation
                  </h3>
                  <div>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                    >
                      {RETURN_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label} {r.photosRequired ? "(Photos Mandatory)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <textarea
                      rows={2}
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Please provide any additional details about the issue..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>
                </section>

                {/* Step 3: Photo Evidence */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      3. Photo Evidence {photosRequired ? <span className="text-red-500">*</span> : "(Optional)"}
                    </h3>
                    <span className="text-[11px] text-gray-400">Max 5 photos (JPG, PNG, WebP)</span>
                  </div>

                  {photosRequired && images.length === 0 && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                      <FaExclamationTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span>Photo proof of the item defect/issue is required for this reason.</span>
                    </div>
                  )}

                  {/* Upload Box & Thumbnails */}
                  <div className="flex flex-wrap items-center gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.publicId || idx}
                        className="relative h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700"
                      >
                        <Image src={img.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow-xs hover:bg-red-700"
                        >
                          <FaTrash className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <label className="flex h-16 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-[11px] font-semibold text-gray-500 hover:border-[#9B4F5E] hover:bg-pink-50/20 dark:border-gray-700 dark:bg-gray-800">
                        <FaUpload className="h-3.5 w-3.5 mb-1 text-gray-400" />
                        <span>{isUploadingPhoto ? "Uploading..." : "+ Add Photo"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          disabled={isUploadingPhoto}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </section>

                {/* Step 4: Refund Method (Cash, MFS, Bank) */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    4. How Would You Like to Receive Your Refund? <span className="text-red-500">*</span>
                  </h3>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {/* MFS Option */}
                    <button
                      type="button"
                      onClick={() => setRefundMethod("MFS")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-colors ${
                        refundMethod === "MFS"
                          ? "border-[#9B4F5E] bg-[#FBF0F0] text-gray-900 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-200"
                          : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <FaMobileAlt className="text-[#9B4F5E]" />
                        <span>MFS Mobile Wallet</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">bKash, Nagad, Rocket</p>
                    </button>

                    {/* Bank Transfer Option */}
                    <button
                      type="button"
                      onClick={() => setRefundMethod("BANK")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-colors ${
                        refundMethod === "BANK"
                          ? "border-[#9B4F5E] bg-[#FBF0F0] text-gray-900 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-200"
                          : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <FaUniversity className="text-[#9B4F5E]" />
                        <span>Bank Transfer</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">BEFTN / NPSB Transfer</p>
                    </button>

                    {/* Cash Option */}
                    <button
                      type="button"
                      onClick={() => setRefundMethod("CASH")}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-colors ${
                        refundMethod === "CASH"
                          ? "border-[#9B4F5E] bg-[#FBF0F0] text-gray-900 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-200"
                          : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <FaMoneyBillWave className="text-[#9B4F5E]" />
                        <span>Cash Handover</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">Outlet / Office Pickup</p>
                    </button>
                  </div>

                  {/* Method Specific Details Inputs */}
                  {refundMethod === "MFS" && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Wallet Provider
                          </label>
                          <select
                            value={mfsDetails.provider}
                            onChange={(e) => setMfsDetails({ ...mfsDetails, provider: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                          >
                            {MFS_PROVIDERS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Account Type
                          </label>
                          <select
                            value={mfsDetails.accountType}
                            onChange={(e) => setMfsDetails({ ...mfsDetails, accountType: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                          >
                            <option value="Personal">Personal</option>
                            <option value="Agent">Agent</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                          11-Digit Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={11}
                          value={mfsDetails.accountNumber}
                          onChange={(e) => setMfsDetails({ ...mfsDetails, accountNumber: e.target.value })}
                          placeholder="e.g. 01712345678"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-mono font-semibold dark:border-gray-700 dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  )}

                  {refundMethod === "BANK" && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Bank Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                            placeholder="e.g. BRAC Bank PLC"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Account Holder Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                            placeholder="Exact name on account"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                            placeholder="e.g. 150120..."
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono font-semibold dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1">
                            Branch / Routing Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={bankDetails.branchName}
                            onChange={(e) => setBankDetails({ ...bankDetails, branchName: e.target.value })}
                            placeholder="e.g. Gulshan Branch"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {refundMethod === "CASH" && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40">
                      <p>
                        Cash refunds can be received in-person at our central hub or showroom upon returning the product.
                      </p>
                      <input
                        type="text"
                        value={cashDetails.preferredLocation}
                        onChange={(e) => setCashDetails({ ...cashDetails, preferredLocation: e.target.value })}
                        placeholder="Preferred pickup hub / note..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>
                  )}
                </section>
              </>
            )}

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {submitError}
              </div>
            )}
          </div>

          {/* Pinned Modal Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-100 p-6 dark:border-gray-800">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Total Refund</span>
              <span className="text-lg font-bold text-[#9B4F5E]">{money(totalEstimatedRefund)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loadingEligibility || !eligibilityData?.hasReturnableItems || totalEstimatedRefund <= 0}
                className="rounded-xl bg-[#9B4F5E] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#85414f] disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Return Request"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

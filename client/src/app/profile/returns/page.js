"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaBox, FaCamera, FaCheckCircle, FaClock, FaExclamationCircle, FaRedo, FaTimesCircle, FaTruck, FaUpload, FaChevronRight } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { returnService } from "@/services/returnService";

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
  DEFECTIVE_DAMAGED: "Defective or damaged item",
  WRONG_ITEM: "Wrong item delivered",
  NOT_AS_DESCRIBED: "Item not as described",
  SIZE_FIT_ISSUE: "Size / fit issue",
  CHANGED_MIND: "Changed mind",
  LATE_DELIVERY: "Late delivery",
};

const stepperStages = [
  { key: "REQUESTED", label: "Requested" },
  { key: "APPROVED", label: "Approved" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "RECEIVED", label: "Inspected" },
  { key: "REFUNDED", label: "Refunded" },
];

function getStageIndex(status) {
  if (["REQUESTED", "INFO_NEEDED"].includes(status)) return 0;
  if (status === "APPROVED" || status === "PICKUP_SCHEDULED") return 1;
  if (status === "IN_TRANSIT") return 2;
  if (status === "RECEIVED" || status === "INSPECTED") return 3;
  if (["REFUNDED", "EXCHANGED", "COMPLETED"].includes(status)) return 4;
  return -1;
}

export default function CustomerReturnsPage() {
  const [returnsList, setReturnsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Upload more photos state
  const [targetReturn, setTargetReturn] = useState(null);
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false);

  const loadReturns = useCallback(() => {
    setIsLoading(true);
    setError("");
    return returnService.list()
      .then((data) => setReturnsList(data || []))
      .catch((err) => setError(err.message || "Failed to load returns."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const filteredReturns = returnsList.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return !["COMPLETED", "REJECTED"].includes(item.status);
    if (activeTab === "COMPLETED") return ["COMPLETED", "REFUNDED", "EXCHANGED"].includes(item.status);
    if (activeTab === "REJECTED") return item.status === "REJECTED";
    if (activeTab === "ACTION") return item.status === "INFO_NEEDED";
    return true;
  });

  const handleExtraPhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (extraPhotos.length + files.length > 5) {
      setUploadError("Maximum 5 photos allowed.");
      return;
    }
    setUploadError("");
    setIsUploading(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5MB limit.`);
        }
        const uploaded = await returnService.uploadEvidence(file);
        setExtraPhotos((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setUploadError(err.message || "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtraSubmit = async () => {
    if (!extraPhotos.length) {
      setUploadError("Please upload at least one photo.");
      return;
    }
    setIsSubmittingExtra(true);
    setUploadError("");
    try {
      await returnService.addPhotos(targetReturn.id, extraPhotos);
      setTargetReturn(null);
      setExtraPhotos([]);
      loadReturns();
    } catch (err) {
      setUploadError(err.message || "Failed to submit photos.");
    } finally {
      setIsSubmittingExtra(false);
    }
  };

  return (
    <ProfileLayout
      title="My Returns & Refunds"
      description="Track the status of your product returns, upload additional photos, and inspect refund settlements."
    >
      {/* Navigation tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "ALL", label: `All Returns (${returnsList.length})` },
          { key: "ACTIVE", label: `In Progress (${returnsList.filter((r) => !["COMPLETED", "REJECTED"].includes(r.status)).length})` },
          { key: "ACTION", label: `Action Needed (${returnsList.filter((r) => r.status === "INFO_NEEDED").length})` },
          { key: "COMPLETED", label: `Completed (${returnsList.filter((r) => ["COMPLETED", "REFUNDED", "EXCHANGED"].includes(r.status)).length})` },
          { key: "REJECTED", label: `Rejected (${returnsList.filter((r) => r.status === "REJECTED").length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === tab.key
                ? "bg-[#9B4F5E] text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
            Loading your returns...
          </div>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF0F0] text-[#9B4F5E] dark:bg-pink-950/40">
            <FaRedo className="text-xl" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-bold text-gray-900 dark:text-gray-100">
            No return requests found
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-gray-500 dark:text-gray-400">
            You haven&apos;t requested any returns under this filter. If you have delivered orders with issues, you can initiate a return from your order details page.
          </p>
          <div className="mt-6">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#9B4F5E] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#864351]"
            >
              <FaBox /> View Delivered Orders
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReturns.map((ret) => {
            const currentStage = getStageIndex(ret.status);
            const isRejected = ret.status === "REJECTED";
            const needsInfo = ret.status === "INFO_NEEDED";

            return (
              <div
                key={ret.id}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Header bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/60">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#9B4F5E]">
                        {ret.return_number}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <Link
                        href={`/orders/${ret.order_id}`}
                        className="text-xs font-semibold text-gray-600 hover:text-[#9B4F5E] dark:text-gray-300"
                      >
                        Order #{ret.order_number || ret.order_id?.slice(0, 8)}
                      </Link>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Requested on {new Date(ret.requested_at || ret.created_at).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        returnStatusBadges[ret.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ret.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Info Needed Alert Banner */}
                {needsInfo && (
                  <div className="border-b border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900 dark:bg-rose-950/30">
                    <div className="flex items-start gap-3">
                      <FaExclamationCircle className="mt-0.5 text-rose-600 text-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                          Action Required: Additional Photos Requested
                        </h4>
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                          {ret.info_needed_prompt || "Our inspection team requires clearer photos of the damaged area, barcode, or package label to process your return."}
                        </p>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetReturn(ret);
                              setExtraPhotos([]);
                              setUploadError("");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                          >
                            <FaUpload /> Upload Requested Photos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Banner */}
                {isRejected && (
                  <div className="border-b border-red-200 bg-red-50/70 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <div className="flex items-start gap-3">
                      <FaTimesCircle className="mt-0.5 text-red-600 text-lg shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                          Return Request Not Approved
                        </h4>
                        <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                          Reason: {ret.rejection_reason || "The return request does not meet our return policy conditions."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Stepper (if not rejected) */}
                {!isRejected && (
                  <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <div className="relative flex justify-between">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-800 -z-0" />
                      <div
                        className="absolute top-4 left-4 h-0.5 bg-[#9B4F5E] transition-all duration-500 -z-0"
                        style={{
                          width: `${Math.max(0, Math.min(100, (currentStage / (stepperStages.length - 1)) * 100))}%`,
                        }}
                      />

                      {stepperStages.map((stage, idx) => {
                        const isDone = idx <= currentStage;
                        const isCurrent = idx === currentStage;
                        return (
                          <div key={stage.key} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                isDone
                                  ? "bg-[#9B4F5E] text-white ring-4 ring-[#FBF0F0] dark:ring-pink-950/50"
                                  : "border-2 border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                              }`}
                            >
                              {isDone ? <FaCheckCircle className="text-xs" /> : idx + 1}
                            </div>
                            <span
                              className={`mt-2 text-[11px] font-semibold tracking-tight ${
                                isCurrent
                                  ? "text-[#9B4F5E]"
                                  : isDone
                                  ? "text-gray-700 dark:text-gray-300"
                                  : "text-gray-400 dark:text-gray-600"
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Body Details */}
                <div className="p-6 space-y-6">
                  {/* Items List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Returned Items ({ret.items?.length || 0})
                    </h4>
                    <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {ret.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-3 min-w-0">
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
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} × {money(item.unit_selling_price)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {money(item.quantity * item.unit_selling_price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return details & reason */}
                  <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-gray-50/70 p-4 dark:bg-gray-800/60">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Reason</p>
                      <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        {reasonLabels[ret.reason] || ret.reason}
                      </p>
                      {ret.customer_note && (
                        <p className="mt-1 text-xs italic text-gray-600 dark:text-gray-400">
                          &quot;{ret.customer_note}&quot;
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Refund Settlement</p>
                      <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        {ret.refund_method === "MFS"
                          ? `Mobile Financial Services (${ret.refund_account_details?.provider?.toUpperCase() || "MFS"})`
                          : ret.refund_method === "BANK"
                          ? `Bank Transfer (${ret.refund_account_details?.bank_name || "Bank"})`
                          : "Cash Handover"}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#9B4F5E]">
                        Estimated Refund: {money(ret.refund_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Photos Gallery */}
                  {Array.isArray(ret.images) && ret.images.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Uploaded Photos ({ret.images.length})
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2.5">
                        {ret.images.map((img, i) => (
                          <button
                            key={img.id || i}
                            type="button"
                            onClick={() => setSelectedPhoto(img.image_url)}
                            className="group relative h-16 w-16 overflow-hidden rounded-xl border border-gray-200 focus:outline-hidden dark:border-gray-700"
                          >
                            <img
                              src={img.image_url}
                              alt="Evidence"
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                              🔍
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload More Photos Modal */}
      {targetReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Upload Additional Photos
                </h3>
                <p className="text-xs text-gray-500">
                  Return {targetReturn.return_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetReturn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="font-bold">Team request: </span>
                {targetReturn.info_needed_prompt || "Please provide clearer pictures of the item defect or packaging."}
              </div>

              {uploadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {uploadError}
                </div>
              )}

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                  Select Photos (Max 5, 5MB each)
                </label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 cursor-pointer hover:border-[#9B4F5E] hover:bg-pink-50/20 transition dark:border-gray-700 dark:bg-gray-800">
                  <FaCamera className="text-2xl text-gray-400 mb-2" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Click to select photos
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">
                    JPG, PNG or WEBP up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isUploading}
                    onChange={handleExtraPhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-[#9B4F5E]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                  Uploading photos to secure storage...
                </div>
              )}

              {/* Photos Preview */}
              {extraPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {extraPhotos.map((img, idx) => (
                    <div key={idx} className="relative h-16 w-16 rounded-xl border overflow-hidden">
                      <img src={img.url} alt="Extra evidence" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExtraPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => setTargetReturn(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtraSubmit}
                disabled={isSubmittingExtra || isUploading || extraPhotos.length === 0}
                className="rounded-xl bg-[#9B4F5E] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#864351] disabled:opacity-50"
              >
                {isSubmittingExtra ? "Submitting..." : "Submit Photos"}
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
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
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
    </ProfileLayout>
  );
}

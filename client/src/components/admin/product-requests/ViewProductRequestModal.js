"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaExternalLinkAlt,
  FaTrashAlt,
  FaCheck,
  FaSpinner,
  FaBoxOpen,
} from "react-icons/fa";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { value: "IN_PROGRESS", label: "In Progress / Sourcing", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  { value: "FULFILLED", label: "Fulfilled / Stocked", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "REJECTED", label: "Rejected / Unavailable", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
];

export default function ViewProductRequestModal({
  isOpen,
  onClose,
  request,
  onUpdateStatus,
  onDelete,
}) {
  const [status, setStatus] = useState("PENDING");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (request) {
      setStatus(request.status || "PENDING");
      setAdminNotes(request.adminNotes || "");
      setSaveSuccess(false);
      setError("");
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      await onUpdateStatus(request.id, {
        status,
        adminNotes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err.message || "Failed to update request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this product request?")) return;
    setIsDeleting(true);
    try {
      await onDelete(request.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete request.");
      setIsDeleting(false);
    }
  };

  // Clean BD phone for WhatsApp link
  const rawDigits = (request.customerPhone || "").replace(/\D/g, "");
  const waNumber = rawDigits.startsWith("88") ? rawDigits : rawDigits.startsWith("0") ? `88${rawDigits}` : `880${rawDigits}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] flex items-center justify-center">
              <FaBoxOpen className="text-base" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Product Request Details
              </h3>
              <p className="text-xs text-gray-400">
                Submitted on {new Date(request.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })} at {new Date(request.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <FaCheck />
              <span>Status and notes updated successfully!</span>
            </div>
          )}

          {/* Requested Product Info */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-[#FAF7F5] dark:bg-gray-800/40 p-4 space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Product Name
              </span>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {request.productName}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Requested Variant / Shade / Size
                </span>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {request.variantText || <span className="text-gray-400 italic">None specified (Standard/Any)</span>}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Source Page
                </span>
                {request.sourceUrl ? (
                  <a
                    href={request.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#9B4F5E] hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
                  >
                    <span>View Page URL</span>
                    <FaExternalLinkAlt className="text-[10px]" />
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">General Request</span>
                )}
              </div>
            </div>

            {request.notes && (
              <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Customer Notes
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 whitespace-pre-wrap">
                  {request.notes}
                </p>
              </div>
            )}
          </div>

          {/* Customer Contact Details */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Customer Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-gray-400 block">Phone Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${request.customerPhone}`}
                    className="text-sm font-bold text-gray-900 dark:text-white hover:text-[#9B4F5E] flex items-center gap-1.5"
                  >
                    <FaPhoneAlt className="text-xs text-[#9B4F5E]" />
                    <span>{request.customerPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs"
                    title="Chat on WhatsApp"
                  >
                    <FaWhatsapp />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 block">Email Address</span>
                {request.customerEmail ? (
                  <a
                    href={`mailto:${request.customerEmail}`}
                    className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-[#9B4F5E] flex items-center gap-1.5 mt-0.5 truncate"
                  >
                    <FaEnvelope className="text-xs text-gray-400" />
                    <span>{request.customerEmail}</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not provided</span>
                )}
              </div>
            </div>

            {(request.customerName || request.userAccountName) && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[11px] text-gray-400 block">Customer Name / Account</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {request.customerName || request.userAccountName}
                  {request.userId && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-[#9B4F5E] dark:bg-pink-950/40">
                      Registered User
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Sourcing Status & Admin Notes */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Request Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      status === opt.value
                        ? `${opt.color} ring-2 ring-[#9B4F5E] border-transparent shadow-xs`
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Internal Admin Notes
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Log vendor contact, estimated arrival date, or customer outreach notes..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FaTrashAlt className="text-xs" />
            <span>{isDeleting ? "Deleting..." : "Delete Request"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


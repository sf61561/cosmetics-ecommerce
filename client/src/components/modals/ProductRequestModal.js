"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaCheckCircle, FaSpinner, FaBoxOpen } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { productRequestService } from "@/services/productRequestService";

export default function ProductRequestModal({ isOpen, onClose, initialData = {} }) {
  const { user } = useAuth();

  const [productName, setProductName] = useState("");
  const [variantText, setVariantText] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  // Sync initial and auth data when modal opens
  useEffect(() => {
    if (isOpen) {
      setProductName(initialData.productName || "");
      setVariantText(initialData.variantText || "");
      setCustomerPhone(user?.phone || "");
      setCustomerEmail(user?.email || "");
      setNotes(initialData.notes || "");
      setErrors({});
      setServerError("");
      setIsSubmitted(false);
    }
  }, [isOpen, initialData, user]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!productName.trim()) {
      newErrors.productName = "Product name is required.";
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required.";
    } else {
      const cleaned = customerPhone.replace(/[\s\-()]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
        newErrors.customerPhone = "Please enter a valid phone number (at least 7 digits).";
      }
    }

    if (customerEmail.trim()) {
      if (/^www\./i.test(customerEmail.trim())) {
        newErrors.customerEmail = "Email address cannot start with 'www.'. Please remove 'www.' from the beginning.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
        newErrors.customerEmail = "Please enter a valid email address.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const currentUrl = typeof window !== "undefined" ? window.location.href : null;

      await productRequestService.submitProductRequest({
        productName: productName.trim(),
        variantText: variantText.trim() || null,
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        customerName: user?.name || null,
        sourceUrl: currentUrl,
        notes: notes.trim() || null,
      });

      setIsSubmitted(true);
    } catch (err) {
      setServerError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-pink-100 dark:border-gray-800 shadow-2xl p-6 sm:p-7 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] dark:text-rose-300 mb-1.5">
              <FaBoxOpen className="text-xs" />
              <span>Sourcing & Pre-Order</span>
            </div>
            <h2
              className="text-xl font-bold text-gray-900 dark:text-white"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              Request a Product
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Can&apos;t find a product, shade, or size? Let us know and our sourcing team will procure it for you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {isSubmitted ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 text-2xl">
                <FaCheckCircle />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Request Received!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
                Thank you! We&apos;ve logged your request for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  &ldquo;{productName}&rdquo;
                </span>
                . Our team will contact you via WhatsApp or phone ({customerPhone}) as soon as it arrives.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
                  {serverError}
                </div>
              )}

              {/* Product Name (Pre-filled if opened from PDP) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (errors.productName) setErrors((prev) => ({ ...prev, productName: null }));
                  }}
                  placeholder="e.g. Beauty of Joseon Relief Sun Rice + Probiotics"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all ${
                    errors.productName
                      ? "border-red-400 ring-1 ring-red-300"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                {errors.productName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.productName}</p>
                )}
              </div>

              {/* Variant Text (Text type: shade, size, formulation) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Variant, Shade or Size <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={variantText}
                  onChange={(e) => setVariantText(e.target.value)}
                  placeholder="e.g. Shade 23N Sand, 100ml, or Fragrance-Free"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all"
                />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Specify any preferred shade code, net volume, or formulation variant.
                </p>
              </div>

              {/* Phone & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Phone (Mandatory) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (errors.customerPhone) setErrors((prev) => ({ ...prev, customerPhone: null }));
                    }}
                    placeholder="e.g. 01712-345678"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all ${
                      errors.customerPhone
                        ? "border-red-400 ring-1 ring-red-300"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                  {errors.customerPhone ? (
                    <p className="text-[11px] text-red-500 mt-1">{errors.customerPhone}</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      We will SMS/WhatsApp you once sourced.
                    </p>
                  )}
                </div>

                {/* Customer Email (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (errors.customerEmail) setErrors((prev) => ({ ...prev, customerEmail: null }));
                    }}
                    placeholder="e.g. name@example.com"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all ${
                      errors.customerEmail
                        ? "border-red-400 ring-1 ring-red-300"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                  {errors.customerEmail && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.customerEmail}</p>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Additional Notes or Reference Link <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste an official brand link or note any specific requests..."
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] active:scale-[0.99] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <span>Submit Product Request</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { FaTimes, FaSpinner, FaUser, FaPhone, FaEnvelope, FaShieldAlt } from "react-icons/fa";

function EditCustomerFormContent({ customer, onClose, onSave }) {
  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(customer.id, {
        name: name.trim(),
        phone: phone.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update customer profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="relative flex flex-col w-full max-w-lg rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden max-h-[85vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Modal Header (Pinned) ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
        <div>
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-gray-100">
            Edit Customer Profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Update permitted information for {customer.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>

      {/* ── Modal Body (Scrollable) ── */}
      <form id="edit-customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
            Customer Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Syed Fahad Mahmud"
              required
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E]"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
            Phone Number
          </label>
          <div className="relative">
            <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E]"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Used for delivery coordination and order SMS status updates.
          </p>
        </div>

        {/* Read-Only Reference Fields */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            System & Security Fields (Read-Only)
          </h3>

          {/* Email */}
          <div>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              Registered Email Address
            </span>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
              <FaEnvelope className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="truncate">{customer.email || "No email registered"}</span>
            </div>
          </div>

          {/* Role & Auth Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                Assigned Role
              </span>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                <FaShieldAlt className="h-3 w-3 text-purple-500" />
                <span>{customer.role}</span>
              </div>
            </div>
            <div>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                Sign-In Provider
              </span>
              <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 capitalize">
                {customer.authProvider || "local"}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Modal Footer (Pinned) ── */}
      <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="edit-customer-form"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isSaving && <FaSpinner className="h-3 w-3 animate-spin" />}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}

export default function EditCustomerModal({
  isOpen = false,
  customer = null,
  onClose = () => {},
  onSave = async () => {},
}) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <EditCustomerFormContent
        key={customer.id}
        customer={customer}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}


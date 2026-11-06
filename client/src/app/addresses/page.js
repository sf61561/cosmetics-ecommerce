"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaMapMarkerAlt,
  FaTrash,
  FaPencilAlt,
  FaStar,
  FaPlus,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { customerAccountService } from "@/services/customerAccountService";
import { BD_DISTRICTS } from "@/components/checkout/bangladeshLocations";

const emptyAddress = {
  label: "Home",
  recipientName: "",
  phone: "",
  division: "Dhaka",
  district: "Dhaka",
  area: "",
  streetAddress: "",
  postalCode: "",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...emptyAddress });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch addresses
  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await customerAccountService.addresses();
      setAddresses(Array.isArray(data) ? data : []);
      setMessage(null);
    } catch (error) {
      setLoadError(error.message);
      setMessage({ type: "error", text: error.message });
      return false;
    } finally {
      setIsLoading(false);
    }
    return true;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isModalOpen && !isSaving) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSaving]);

  // Open modal for new address
  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyAddress });
    setIsModalOpen(true);
    setMessage(null);
  };

  // Open modal for editing existing address
  const handleStartEdit = (addr) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label || "Home",
      recipientName: addr.recipient_name || "",
      phone: addr.phone || "",
      division: addr.division || "Dhaka",
      district: addr.district || "Dhaka",
      area: addr.area || "",
      streetAddress: addr.street_address || "",
      postalCode: addr.postal_code || "",
    });
    setIsModalOpen(true);
    setMessage(null);
  };

  // Close modal
  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyAddress });
  };

  const handleDistrictChange = (selectedDistrict) => {
    const matched = BD_DISTRICTS.find((d) => d.name === selectedDistrict);
    setForm((prev) => ({
      ...prev,
      district: selectedDistrict,
      division: matched ? matched.division : prev.division,
    }));
  };

  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    setMessage(null);
    try {
      await customerAccountService.setDefaultAddress(id);
      await load();
      setMessage({ type: "success", text: "Default delivery address updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        await customerAccountService.updateAddress(editingId, {
          ...form,
        });
        setIsModalOpen(false);
        setEditingId(null);
        setForm({ ...emptyAddress });
        if (await load()) {
          setMessage({ type: "success", text: "Address updated successfully." });
        }
      } else {
        await customerAccountService.addAddress({
          ...form,
          isDefault: addresses.length === 0,
        });
        setIsModalOpen(false);
        setForm({ ...emptyAddress });
        if (await load()) {
          setMessage({ type: "success", text: "Your address has been saved." });
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await customerAccountService.deleteAddress(id);
      if (editingId === id) handleCloseModal();
      if (await load()) setMessage({ type: "success", text: "Address removed." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProfileLayout
      title="Saved Addresses"
      description="Manage your delivery addresses and set your default destination for express checkout."
    >
      {/* ── Status Alert Banner ── */}
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-2xl border p-4 text-xs font-medium animate-in fade-in mb-6 ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Header: Address Book Title & Add Address Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200/80 dark:border-gray-800 mb-6">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Your Address Book
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <FaPlus className="text-xs" />
          <span>Add Address</span>
        </button>
      </div>

      {/* ── Addresses Listing ── */}
      {isLoading ? (
        <div
          role="status"
          className="rounded-3xl bg-white dark:bg-gray-900 p-12 text-center text-xs text-gray-500 border border-gray-200/80 dark:border-gray-800"
        >
          <FaSpinner className="animate-spin text-lg text-[#9B4F5E] mx-auto mb-2" />
          <p>Loading your saved addresses...</p>
        </div>
      ) : loadError ? (
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-10 text-center border border-gray-200/80 dark:border-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-300">Saved addresses could not be loaded.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 text-xs font-semibold text-[#9B4F5E] underline cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {addresses.map((address) => {
            const isInside =
              (address.district && /dhaka/i.test(address.district)) ||
              (!address.district && address.division && /dhaka/i.test(address.division));

            return (
              <article
                key={address.id}
                className={`rounded-3xl border-2 p-5 sm:p-6 transition-all shadow-xs flex flex-col justify-between ${
                  address.is_default
                    ? "border-[#9B4F5E] bg-rose-50/30 dark:bg-rose-950/20"
                    : "border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 font-serif text-sm font-bold text-gray-900 dark:text-white">
                        <FaMapMarkerAlt className="text-[#9B4F5E] text-xs shrink-0" />
                        <span>{address.label || "Home"}</span>
                      </span>

                      {address.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <FaStar className="text-[8px]" />
                          <span>Default</span>
                        </span>
                      )}

                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {isInside ? "Inside Dhaka (৳70)" : "Nationwide (৳130)"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(address.id)}
                      disabled={deletingId === address.id}
                      aria-label={`Delete ${address.label || "saved"} address`}
                      className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                      title="Delete Address"
                    >
                      {deletingId === address.id ? (
                        <FaSpinner className="animate-spin text-xs" />
                      ) : (
                        <FaTrash className="text-xs" />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300 space-y-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {address.recipient_name}
                      <span className="text-gray-400 font-normal mx-1.5">•</span>
                      <span className="font-normal">{address.phone}</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {[
                        address.street_address,
                        address.area,
                        address.district,
                        address.division,
                        address.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(address)}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline cursor-pointer"
                  >
                    <FaPencilAlt className="text-[10px]" />
                    <span>Edit Address</span>
                  </button>

                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={settingDefaultId === address.id}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FaStar className="text-[10px]" />
                      <span>
                        {settingDefaultId === address.id ? "Setting..." : "Set as Default"}
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-12 text-center border border-gray-200/80 dark:border-gray-800 space-y-3">
          <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] flex items-center justify-center mx-auto text-xl">
            <FaMapMarkerAlt />
          </div>
          <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white">
            No saved addresses yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Save your delivery addresses for a seamless one-click Cash on Delivery checkout experience.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer mt-2"
          >
            <FaPlus className="text-xs" />
            <span>Add Your First Address</span>
          </button>
        </div>
      )}

      {/* ── Modal: Add or Edit Address ── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Pinned Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? "Edit Delivery Address" : "Add Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="address-modal-form" onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Address Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Address Label
                </label>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, label: lbl }))}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        form.label === lbl
                          ? "bg-[#9B4F5E] text-white border-[#9B4F5E]"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  autoComplete="name"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  placeholder="Recipient full name"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden transition-all"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  City / District <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden cursor-pointer transition-all"
                >
                  {BD_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area / Thana */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Area / Thana <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Area, Thana, or Neighborhood"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden transition-all"
                />
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Street Address / House & Road <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.streetAddress}
                  onChange={(e) => setForm({ ...form, streetAddress: e.target.value })}
                  placeholder="House number, road number, flat/level"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden transition-all"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="e.g. 1205"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] focus:outline-hidden transition-all"
                />
              </div>
            </form>

            {/* Pinned Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="rounded-full border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="address-modal-form"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <FaSpinner className="animate-spin text-xs" />}
                <span>
                  {isSaving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Save Address"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

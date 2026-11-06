"use client";

import { useCallback, useEffect, useState } from "react";
import { FaMapMarkerAlt, FaTrash, FaPencilAlt, FaStar, FaPlus, FaCheck, FaTimes } from "react-icons/fa";
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
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDistrictChange = (selectedDistrict) => {
    const matched = BD_DISTRICTS.find((d) => d.name === selectedDistrict);
    setForm((prev) => ({
      ...prev,
      district: selectedDistrict,
      division: matched ? matched.division : prev.division,
    }));
  };

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
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ ...emptyAddress });
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
    setDeletingId(id);
    setMessage(null);
    try {
      await customerAccountService.deleteAddress(id);
      if (editingId === id) handleCancelEdit();
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

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.15fr)]">
        {/* ── Form: Add or Edit Address ── */}
        <form
          onSubmit={save}
          className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-7 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? "Edit Delivery Address" : "Add a New Address"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <FaTimes className="text-[10px]" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Label */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Address Label
              </label>
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, label: lbl }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      form.label === lbl
                        ? "bg-[#9B4F5E] text-white border-[#9B4F5E]"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                autoComplete="name"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                placeholder="e.g. Sadia Rahman"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* Phone */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01712-XXXXXX"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                City / District <span className="text-red-500">*</span>
              </label>
              <select
                value={form.district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Area / Thana <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="e.g. Dhanmondi, Banani, Mirpur"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Street Address / House & Road <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={form.streetAddress}
                onChange={(e) => setForm({ ...form, streetAddress: e.target.value })}
                placeholder="e.g. House 24, Road 7, Block B, Flat 4A"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Postal Code (Optional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="e.g. 1205"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || isLoading || Boolean(loadError)}
            className="w-full rounded-full bg-[#9B4F5E] px-4 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSaving
              ? "Saving address..."
              : editingId
              ? "Save Address Changes"
              : "Save Delivery Address"}
          </button>
        </form>

        {/* ── Saved Addresses List ── */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800">
            Your Address Book ({addresses.length})
          </h2>

          {isLoading ? (
            <div role="status" className="rounded-3xl bg-white dark:bg-gray-900 p-10 text-center text-xs text-gray-500">
              Loading your saved addresses...
            </div>
          ) : loadError ? (
            <div className="rounded-3xl bg-white dark:bg-gray-900 p-10 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">Saved addresses could not be loaded.</p>
              <button
                type="button"
                onClick={load}
                className="mt-3 text-xs font-semibold text-[#9B4F5E] underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : addresses.length ? (
            <div className="space-y-3.5">
              {addresses.map((address) => {
                const isInside =
                  (address.district && /dhaka/i.test(address.district)) ||
                  (!address.district && address.division && /dhaka/i.test(address.division));

                return (
                  <article
                    key={address.id}
                    className={`rounded-3xl border-2 p-5 transition-all shadow-xs ${
                      address.is_default
                        ? "border-[#9B4F5E] bg-rose-50/30 dark:bg-rose-950/20"
                        : "border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <FaMapMarkerAlt className="mt-1 shrink-0 text-[#9B4F5E]" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-sm font-bold text-gray-900 dark:text-white">
                              {address.label || "Address"}
                            </h3>
                            {address.is_default && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <FaStar className="text-[8px]" />
                                <span>Default</span>
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {isInside ? "Inside Dhaka (৳70)" : "Nationwide (৳130)"}
                            </span>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {address.recipient_name}
                            </span>{" "}
                            • {address.phone}
                            <br />
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

                      {/* Top Right: Delete button */}
                      <button
                        type="button"
                        onClick={() => remove(address.id)}
                        disabled={deletingId === address.id}
                        aria-label={`Delete ${address.label || "saved"} address`}
                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Delete Address"
                      >
                        {deletingId === address.id ? "..." : <FaTrash className="text-xs" />}
                      </button>
                    </div>

                    {/* Bottom Actions Bar */}
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
            <div className="rounded-3xl bg-white dark:bg-gray-900 p-10 text-center border border-gray-200/80 dark:border-gray-800">
              <h3 className="font-serif text-sm font-bold text-gray-900 dark:text-white">
                No saved addresses yet
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add your delivery destination on the left and it will be saved for quick checkout.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}

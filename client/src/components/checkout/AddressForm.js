"use client";

import { useState } from "react";
import {
  FaUser,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaLocationArrow,
  FaChevronDown,
  FaPlus,
  FaMinus,
  FaShieldAlt,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";
import { BD_DISTRICTS } from "./bangladeshLocations";

export default function AddressForm({
  initialValues = {},
  onSubmit,
  onCancel,
  hasSavedAddresses = false,
  isSubmitting = false,
}) {
  const isEditing = Boolean(initialValues?.id);
  const [formData, setFormData] = useState({
    recipientName: initialValues.recipient_name || initialValues.recipientName || "",
    phone: initialValues.phone || "",
    district: initialValues.district || "Dhaka",
    division: initialValues.division || "Dhaka",
    area: initialValues.area || "",
    streetAddress: initialValues.street_address || initialValues.streetAddress || "",
    landmark: initialValues.landmark || "",
    postalCode: initialValues.postal_code || initialValues.postalCode || "",
    label: initialValues.label || "Home",
    isDefault: initialValues.is_default !== undefined ? initialValues.is_default : (initialValues.isDefault !== false),
    billingSameAsShipping: true,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showOptionals, setShowOptionals] = useState(
    Boolean(initialValues.landmark || initialValues.postalCode)
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState("");

  // Validate a single field
  const validateField = (field, value) => {
    switch (field) {
      case "recipientName":
        if (!value || !value.trim()) return "Please enter the recipient's full name.";
        if (value.trim().length < 3) return "Name must be at least 3 characters.";
        return "";
      case "phone": {
        const cleaned = (value || "").replace(/[^0-9]/g, "");
        if (!cleaned) return "Mobile number is required for courier delivery.";
        if (!/^01[3-9]\d{8}$/.test(cleaned)) {
          return "Please enter a valid 11-digit Bangladeshi number (e.g. 01712-345678).";
        }
        return "";
      }
      case "district":
        if (!value || !value.trim()) return "Please choose a delivery district.";
        return "";
      case "area":
        if (!value || !value.trim()) return "Please specify your area or thana (e.g. Uttara, Banani, Dhanmondi).";
        return "";
      case "streetAddress":
        if (!value || !value.trim()) return "Please enter street, road, and house/flat number.";
        if (value.trim().length < 5) return "Please provide more address details so the rider can find you.";
        return "";
      case "postalCode":
        if (value && !/^\d{4}$/.test(value.trim())) {
          return "Postal codes in Bangladesh are 4 digits.";
        }
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // If district changed, auto-assign division
      if (field === "district") {
        const matched = BD_DISTRICTS.find((d) => d.name === value);
        if (matched) {
          next.division = matched.division;
        }
      }
      return next;
    });

    // If already touched, validate dynamically to clear error
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  // Optional Geolocation Shortcut
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateMsg("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocateMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          // Reverse geocode via free OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.state_district || addr.state || "";
            const road = [addr.road, addr.suburb || addr.neighbourhood].filter(Boolean).join(", ");

            if (city.toLowerCase().includes("dhaka")) {
              handleChange("district", "Dhaka");
            }
            if (road && !formData.streetAddress) {
              handleChange("streetAddress", road);
            }
            if ((addr.suburb || addr.neighbourhood) && !formData.area) {
              handleChange("area", addr.suburb || addr.neighbourhood);
            }
            setLocateMsg("Location detected successfully!");
          } else {
            setLocateMsg("Location detected! Please review and confirm your details.");
          }
        } catch {
          setLocateMsg("Location coordinates detected. Please confirm street details.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocateMsg("Location permission denied. Please fill in your address manually.");
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all core fields
    const fieldsToValidate = ["recipientName", "phone", "district", "area", "streetAddress"];
    if (formData.postalCode) fieldsToValidate.push("postalCode");

    const newErrors = {};
    fieldsToValidate.forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    setTouched(
      fieldsToValidate.reduce((acc, f) => {
        acc[f] = true;
        return acc;
      }, {})
    );
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Pass validated address to parent
    onSubmit({
      ...formData,
      streetAddress: formData.landmark
        ? `${formData.streetAddress} (Landmark: ${formData.landmark})`
        : formData.streetAddress,
    });
  };

  const isInsideDhaka = formData.district?.toLowerCase() === "dhaka";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* ── Top Bar: Location Shortcut & Subheading ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? "Edit Delivery Address" : hasSavedAddresses ? "Add New Delivery Address" : "Delivery Address Details"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Where should our courier deliver your beauty ritual?
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 px-3 py-1.5 rounded-full border border-rose-200/60 dark:border-rose-900/60 transition-colors cursor-pointer"
        >
          {isLocating ? (
            <FaSpinner className="animate-spin text-xs" />
          ) : (
            <FaLocationArrow className="text-[10px]" />
          )}
          <span>{isLocating ? "Detecting location..." : "Use current location"}</span>
        </button>
      </div>

      {locateMsg && (
        <div className="p-2.5 rounded-xl text-xs bg-rose-50/60 dark:bg-rose-950/30 text-gray-700 dark:text-gray-300 border border-rose-200/60 dark:border-rose-900/60 flex items-center gap-2 animate-in fade-in">
          <FaInfoCircle className="text-xs text-[#9B4F5E] shrink-0" />
          <span>{locateMsg}</span>
        </div>
      )}

      {/* ── Field 1: Recipient Full Name ── */}
      <div>
        <label
          htmlFor="recipientName"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="recipientName"
            type="text"
            name="name"
            autoComplete="name"
            value={formData.recipientName}
            onChange={(e) => handleChange("recipientName", e.target.value)}
            onBlur={() => handleBlur("recipientName")}
            placeholder="e.g. Sadia Rahman"
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all ${
              touched.recipientName && errors.recipientName
                ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
                : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20"
            } focus:outline-hidden`}
          />
          <FaUser className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        {touched.recipientName && errors.recipientName && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
            {errors.recipientName}
          </p>
        )}
      </div>

      {/* ── Field 2: Mobile Phone (with trust microcopy) ── */}
      <div>
        <label
          htmlFor="phone"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="phone"
            type="tel"
            name="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            placeholder="01712-XXXXXX"
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all ${
              touched.phone && errors.phone
                ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
                : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20"
            } focus:outline-hidden`}
          />
          <FaPhoneAlt className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        {touched.phone && errors.phone ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.phone}</p>
        ) : (
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FaShieldAlt className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Only used by the delivery rider to coordinate drop-off.</span>
          </p>
        )}
      </div>

      {/* ── Field 3 & 4: District & Area / Thana ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* District Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="district"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              City / District <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isInsideDhaka
                  ? "bg-rose-50 text-[#9B4F5E] dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              }`}
            >
              {isInsideDhaka ? "৳70 • Inside Dhaka" : "৳130 • Nationwide"}
            </span>
          </div>
          <div className="relative">
            <select
              id="district"
              name="address-level2"
              autoComplete="address-level2"
              value={formData.district}
              onChange={(e) => handleChange("district", e.target.value)}
              onBlur={() => handleBlur("district")}
              className="w-full appearance-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 focus:outline-hidden cursor-pointer"
            >
              <optgroup label="Popular Delivery Destinations">
                {BD_DISTRICTS.filter((d) => d.popular).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} {d.zone === "INSIDE_DHAKA" ? "(Inside Dhaka)" : "(Outside Dhaka)"}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All 64 Bangladesh Districts">
                {BD_DISTRICTS.filter((d) => !d.popular).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          </div>
        </div>

        {/* Area / Thana */}
        <div>
          <label
            htmlFor="area"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Area / Thana <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="area"
              type="text"
              name="address-level3"
              value={formData.area}
              onChange={(e) => handleChange("area", e.target.value)}
              onBlur={() => handleBlur("area")}
              placeholder="e.g. Dhanmondi, Uttara, Mirpur, Banani"
              className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all ${
                touched.area && errors.area
                  ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20"
              } focus:outline-hidden`}
            />
            <FaMapMarkerAlt className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          </div>
          {touched.area && errors.area && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.area}</p>
          )}
        </div>
      </div>

      {/* ── Field 5: Street Address / House & Road Details ── */}
      <div>
        <label
          htmlFor="streetAddress"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Street Address / House, Road & Flat <span className="text-red-500">*</span>
        </label>
        <textarea
          id="streetAddress"
          name="street-address"
          autoComplete="street-address"
          rows={2}
          value={formData.streetAddress}
          onChange={(e) => handleChange("streetAddress", e.target.value)}
          onBlur={() => handleBlur("streetAddress")}
          placeholder="e.g. House 24, Road 7, Block B, Flat 4A"
          className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 transition-all ${
            touched.streetAddress && errors.streetAddress
              ? "border-red-500 ring-1 ring-red-500/30 focus:border-red-500"
              : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20"
          } focus:outline-hidden`}
        />
        {touched.streetAddress && errors.streetAddress && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
            {errors.streetAddress}
          </p>
        )}
      </div>

      {/* ── Collapsible Optional Fields Accordion ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptionals(!showOptionals)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline cursor-pointer"
        >
          {showOptionals ? <FaMinus className="text-[10px]" /> : <FaPlus className="text-[10px]" />}
          <span>
            {showOptionals
              ? "Hide optional landmark & postal code"
              : "+ Add landmark or postal code (Optional)"}
          </span>
        </button>

        {showOptionals && (
          <div className="mt-3 p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 space-y-3.5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Landmark */}
              <div>
                <label
                  htmlFor="landmark"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1"
                >
                  Nearby Landmark
                </label>
                <input
                  id="landmark"
                  type="text"
                  value={formData.landmark}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  placeholder="e.g. Behind City Bank, Opposite Mosque"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label
                  htmlFor="postalCode"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1"
                >
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={formData.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  onBlur={() => handleBlur("postalCode")}
                  placeholder="e.g. 1205"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
                {touched.postalCode && errors.postalCode && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {errors.postalCode}
                  </p>
                )}
              </div>
            </div>

            {/* Label: Home vs Work */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                Address Label
              </label>
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 text-xs font-medium">
                {["Home", "Work", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => handleChange("label", lbl)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      formData.label === lbl
                        ? "bg-[#9B4F5E] text-white font-semibold"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Checkboxes: Billing Same as Shipping & Save to Address Book ── */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={formData.billingSameAsShipping}
            onChange={(e) => handleChange("billingSameAsShipping", e.target.checked)}
            className="w-4 h-4 rounded text-[#9B4F5E] focus:ring-[#9B4F5E] border-gray-300 dark:border-gray-700"
          />
          <span>Billing address is same as delivery address</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => handleChange("isDefault", e.target.checked)}
            className="w-4 h-4 rounded text-[#9B4F5E] focus:ring-[#9B4F5E] border-gray-300 dark:border-gray-700"
          />
          <span>Save this address for future orders</span>
        </label>
      </div>

      {/* ── Actions: Save / Deliver & Cancel ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting && <FaSpinner className="animate-spin text-xs" />}
          <span>{isSubmitting ? "Saving address..." : isEditing ? "Save Changes" : "Deliver to this Address"}</span>
        </button>

        {hasSavedAddresses && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}


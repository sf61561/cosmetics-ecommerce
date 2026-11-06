"use client";

import { FaCheckCircle, FaMapMarkerAlt, FaPhoneAlt, FaPencilAlt } from "react-icons/fa";

export default function AddressSummaryCard({ address, onEdit }) {
  if (!address) return null;

  const recipientName = address.recipient_name || address.recipientName || "Recipient";
  const phone = address.phone || "";
  const street = address.street_address || address.streetAddress || "";
  const area = address.area || "";
  const district = address.district || "";
  const postalCode = address.postal_code || address.postalCode || "";
  const label = address.label || "Home";

  const isInside =
    (district && /dhaka/i.test(district)) ||
    (!district && address.division && /dhaka/i.test(address.division));

  return (
    <div className="rounded-3xl border-2 border-[#9B4F5E]/30 bg-rose-50/30 dark:bg-rose-950/20 p-5 sm:p-6 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100 dark:border-rose-900/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FaCheckCircle className="text-xs" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#9B4F5E] dark:text-rose-300">
            Delivering To ({label})
          </span>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline cursor-pointer bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900/60 shadow-2xs hover:shadow-xs transition-all"
        >
          <FaPencilAlt className="text-[10px]" />
          <span>Change Address</span>
        </button>
      </div>

      <div className="mt-3.5 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-serif text-base font-bold text-gray-900 dark:text-white">
            {recipientName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal flex items-center gap-1">
            <FaPhoneAlt className="text-[10px] text-gray-400" />
            <span>{phone}</span>
          </span>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1.5 leading-relaxed">
          <FaMapMarkerAlt className="text-xs text-[#9B4F5E] shrink-0 mt-0.5" />
          <span>
            {street}
            {area ? `, ${area}` : ""}
            {district ? `, ${district}` : ""}
            {postalCode ? ` - ${postalCode}` : ""}
          </span>
        </p>

        <div className="pt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
            <span>Shipping:</span>
            <span className="text-[#9B4F5E] dark:text-rose-300">
              {isInside ? "Inside Dhaka Metropolitan (৳70)" : "Nationwide Delivery (৳130)"}
            </span>
          </span>
          <span>•</span>
          <span>{isInside ? "2-3 business days" : "3-5 business days"}</span>
        </div>
      </div>
    </div>
  );
}

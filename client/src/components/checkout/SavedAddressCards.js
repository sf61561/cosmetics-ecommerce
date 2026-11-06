"use client";

import { FaCheckCircle, FaPlus, FaPhoneAlt, FaMapMarkerAlt, FaHome, FaBriefcase } from "react-icons/fa";

export default function SavedAddressCards({
  addresses = [],
  selectedAddressId,
  onSelectAddress,
  onAddNewAddress,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Saved Delivery Addresses ({addresses.length})
        </h3>
        <button
          type="button"
          onClick={onAddNewAddress}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline cursor-pointer"
        >
          <FaPlus className="text-[10px]" />
          <span>New address</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {addresses.map((addr) => {
          const isSelected = addr.id === selectedAddressId;
          const isInside =
            (addr.district && /dhaka/i.test(addr.district)) ||
            (!addr.district && addr.division && /dhaka/i.test(addr.division));

          return (
            <div
              key={addr.id}
              onClick={() => onSelectAddress(addr.id)}
              className={`relative rounded-2xl p-4 sm:p-5 border-2 text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? "border-[#9B4F5E] bg-rose-50/40 dark:bg-rose-950/20 shadow-xs ring-1 ring-[#9B4F5E]/30"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xs"
              }`}
            >
              <div>
                {/* Header: Label & Badges & Radio Indicator */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                      {addr.label?.toLowerCase() === "office" || addr.label?.toLowerCase() === "work" ? (
                        <FaBriefcase className="text-[10px]" />
                      ) : (
                        <FaHome className="text-[10px]" />
                      )}
                      <span>{addr.label || "Home"}</span>
                    </span>

                    {addr.is_default && (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                        Default
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#9B4F5E] text-white"
                        : "border-2 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {isSelected && <FaCheckCircle className="text-xs" />}
                  </div>
                </div>

                {/* Recipient Full Name */}
                <p className="font-serif text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {addr.recipient_name}
                </p>

                {/* Mobile Phone */}
                <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mt-1">
                  <FaPhoneAlt className="text-[10px] text-gray-400 shrink-0" />
                  <span>{addr.phone}</span>
                </p>

                {/* Street, Area, District */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed flex items-start gap-1.5">
                  <FaMapMarkerAlt className="text-[11px] text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {addr.street_address}
                    {addr.area ? `, ${addr.area}` : ""}
                    {addr.district ? `, ${addr.district}` : ""}
                    {addr.postal_code ? ` - ${addr.postal_code}` : ""}
                  </span>
                </p>
              </div>

              {/* Delivery Zone Rate Pill */}
              <div className="mt-3.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-gray-400">
                  {isInside ? "Inside Dhaka (2-3 days)" : "Nationwide Delivery (3-5 days)"}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {isInside ? "৳70" : "৳130"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Dashed Add New Address Card */}
        <button
          type="button"
          onClick={onAddNewAddress}
          className="rounded-2xl p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#9B4F5E] dark:hover:border-rose-400 bg-gray-50/50 dark:bg-gray-800/20 hover:bg-rose-50/20 text-gray-600 dark:text-gray-300 flex flex-col items-center justify-center gap-2 min-h-[140px] transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 group-hover:text-[#9B4F5E] group-hover:border-[#9B4F5E] transition-colors shadow-2xs">
            <FaPlus className="text-xs" />
          </div>
          <span className="text-xs font-semibold group-hover:text-[#9B4F5E] transition-colors">
            Add Another Address
          </span>
        </button>
      </div>
    </div>
  );
}


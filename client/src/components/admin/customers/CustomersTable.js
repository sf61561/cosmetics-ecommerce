"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FaEye, FaEdit, FaBan, FaCheck, FaExclamationCircle } from "react-icons/fa";

function CustomerAvatar({ src, name, initials }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/70 text-[#9B4F5E] dark:text-pink-300 font-semibold text-xs border border-pink-200/60 dark:border-pink-900/60">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100">
      <Image
        src={src}
        alt={name || "Customer avatar"}
        fill
        className="object-cover"
        sizes="40px"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function CustomersTable({
  customers = [],
  isLoading = false,
  error = null,
  onEdit = () => {},
  onToggleStatus = () => {},
  onRetry = () => {},
}) {
  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-8 text-center space-y-3">
        <FaExclamationCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="font-serif text-lg font-medium text-red-800 dark:text-red-300">
          Failed to load customers
        </h3>
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center px-4 py-2 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-300 flex items-center justify-center mx-auto text-xl">
          👥
        </div>
        <h3 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100">
          No Customers Found
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No customer accounts matched your current search and filter criteria. Try adjusting your search query or reset filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs overflow-hidden">
      {/* ── Desktop & Tablet Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-4 pl-6 pr-4">Customer</th>
              <th className="py-4 px-4">Contact</th>
              <th className="py-4 px-4 text-center">Orders</th>
              <th className="py-4 px-4 text-right">Total Spent</th>
              <th className="py-4 px-4">Joined Date</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 pl-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs sm:text-sm">
            {customers.map((customer) => {
              const initials = customer.name
                ? customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "CU";
              const isBlocked = customer.status === "BLOCKED";

              return (
                <tr
                  key={customer.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Customer Avatar & Name */}
                  <td className="py-4 pl-6 pr-4">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="group flex items-center gap-3"
                    >
                      <CustomerAvatar
                        src={customer.profilePicture}
                        name={customer.name}
                        initials={initials}
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9B4F5E] dark:group-hover:text-pink-300 transition-colors block">
                          {customer.name}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          ID: {customer.id.slice(0, 8)}...
                        </span>
                      </div>
                    </Link>
                  </td>

                  {/* Contact Info */}
                  <td className="py-4 px-4 space-y-0.5">
                    <div className="text-gray-800 dark:text-gray-200 font-medium">
                      {customer.email || (
                        <span className="text-gray-400 italic">No email</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {customer.phone || (
                        <span className="text-gray-400 italic">No phone</span>
                      )}
                    </div>
                  </td>

                  {/* Orders Count */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {customer.orderCount}
                    </span>
                  </td>

                  {/* Total Spending in BDT */}
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ৳{customer.totalSpent.toLocaleString()}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 pl-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details */}
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        title="View Customer Profile"
                        className="p-2 rounded-xl text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <FaEye className="h-3.5 w-3.5" />
                      </Link>

                      {/* Edit Profile */}
                      <button
                        type="button"
                        onClick={() => onEdit(customer)}
                        title="Edit Customer Info"
                        className="p-2 rounded-xl text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                      </button>

                      {/* Block / Unblock */}
                      <button
                        type="button"
                        onClick={() => onToggleStatus(customer)}
                        title={isBlocked ? "Unblock Account" : "Block Account"}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isBlocked
                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-gray-800"
                            : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {isBlocked ? (
                          <FaCheck className="h-3.5 w-3.5" />
                        ) : (
                          <FaBan className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


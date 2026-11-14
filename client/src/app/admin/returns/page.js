"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaBox,
  FaCamera,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaEye,
  FaFilter,
  FaRedo,
  FaSearch,
  FaTimesCircle,
  FaTruck,
  FaUndo,
} from "react-icons/fa";
import { adminReturnService } from "@/services/adminReturnService";
import Pagination from "@/components/admin/Pagination";

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
  DEFECTIVE_DAMAGED: "Defective / Damaged",
  WRONG_ITEM: "Wrong Item",
  NOT_AS_DESCRIBED: "Not as Described",
  SIZE_FIT_ISSUE: "Size / Fit Issue",
  CHANGED_MIND: "Changed Mind",
  LATE_DELIVERY: "Late Delivery",
};

export default function AdminReturnsPage() {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    reason: "all",
    sortBy: "date",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReturns = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await adminReturnService.list(filters);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load returns.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const summary = data?.summary || {};

  const handleStatusTab = (statusKey) => {
    setFilters((prev) => ({ ...prev, status: statusKey, page: 1 }));
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF0F0] text-[#9B4F5E] dark:bg-pink-950/40">
              <FaUndo className="text-sm" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              Returns & Refunds
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Review customer claims, inspect returned items, and disburse refunds to MFS, Bank, or Cash.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-[11px] font-semibold uppercase text-gray-500">Total Returns</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.all_returns || 0}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">Lifetime requests</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {(summary.requested || 0) + (summary.info_needed || 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
            {summary.info_needed || 0} waiting for photos
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs dark:border-purple-900 dark:bg-purple-950/20">
          <p className="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-400">In Transit</p>
          <p className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-200">
            {summary.in_transit || 0}
          </p>
          <p className="mt-0.5 text-[11px] text-purple-600 dark:text-purple-400">Courier / drop-off</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-2xs dark:border-teal-900 dark:bg-teal-950/20">
          <p className="text-[11px] font-semibold uppercase text-teal-700 dark:text-teal-400">Needs Inspection</p>
          <p className="mt-1 text-2xl font-bold text-teal-900 dark:text-teal-200">
            {summary.received || 0}
          </p>
          <p className="mt-0.5 text-[11px] text-teal-600 dark:text-teal-400">Received at hub</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {(summary.refunded || 0) + (summary.completed || 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">Refunded / settled</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[
          { key: "all", label: "All" },
          { key: "REQUESTED", label: `Pending Review (${summary.requested || 0})` },
          { key: "INFO_NEEDED", label: `Info Needed (${summary.info_needed || 0})` },
          { key: "APPROVED", label: `Approved (${summary.approved || 0})` },
          { key: "IN_TRANSIT", label: `In Transit (${summary.in_transit || 0})` },
          { key: "RECEIVED", label: `Received (${summary.received || 0})` },
          { key: "INSPECTED", label: `Inspected (${summary.inspected || 0})` },
          { key: "REFUNDED", label: `Refunded (${summary.refunded || 0})` },
          { key: "COMPLETED", label: `Completed (${summary.completed || 0})` },
          { key: "REJECTED", label: `Rejected (${summary.rejected || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleStatusTab(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filters.status.toUpperCase() === tab.key.toUpperCase()
                ? "bg-[#9B4F5E] text-white shadow-2xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Reason Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            placeholder="Search by Return #, Order #, customer name, email or phone..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs shadow-2xs focus:border-[#9B4F5E] focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
        </div>

        <div className="w-48">
          <select
            value={filters.reason}
            onChange={(e) => setFilters((prev) => ({ ...prev, reason: e.target.value, page: 1 }))}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-2xs focus:border-[#9B4F5E] focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="all">All Reasons</option>
            <option value="DEFECTIVE_DAMAGED">Defective / Damaged</option>
            <option value="WRONG_ITEM">Wrong Item</option>
            <option value="NOT_AS_DESCRIBED">Not as Described</option>
            <option value="SIZE_FIT_ISSUE">Size / Fit Issue</option>
            <option value="CHANGED_MIND">Changed Mind</option>
            <option value="LATE_DELIVERY">Late Delivery</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFAFC] text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-850">
                <th className="py-3.5 px-4">Return #</th>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Refund Method & Details</th>
                <th className="py-3.5 px-4">Est. Refund</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent mr-2" />
                    Loading returns...
                  </td>
                </tr>
              ) : !data?.returns?.length ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No returns found matching the current criteria.
                  </td>
                </tr>
              ) : (
                data.returns.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/returns/${item.id}`}
                          className="font-mono font-bold text-[#9B4F5E] hover:underline"
                        >
                          {item.returnNumber}
                        </Link>
                        {item.imagesCount > 0 && (
                          <span
                            title={`${item.imagesCount} customer photos`}
                            className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          >
                            <FaCamera className="text-[9px]" /> {item.imagesCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(item.requestedAt || item.createdAt).toLocaleDateString("en-BD", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders?search=${item.orderNumber}`}
                        className="font-medium text-gray-700 hover:text-[#9B4F5E] dark:text-gray-300"
                      >
                        {item.orderNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                        {item.customer?.name || "Customer"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                        {item.customer?.phone || item.customer?.email}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {reasonLabels[item.reason] || item.reason}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {item.refundMethod}
                        </span>
                        {item.refundMethod === "MFS" && (
                          <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300">
                            {item.refundAccountDetails?.provider?.toUpperCase()}: {item.refundAccountDetails?.account_number}
                          </p>
                        )}
                        {item.refundMethod === "BANK" && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300">
                            {item.refundAccountDetails?.bank_name} • {item.refundAccountDetails?.account_number?.slice(-4)}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                      {money(item.refundAmount)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          returnStatusBadges[item.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/returns/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#9B4F5E] shadow-2xs hover:bg-[#FBF0F0] dark:border-gray-700 dark:bg-gray-850 dark:hover:bg-pink-950/40"
                      >
                        <FaEye className="text-xs" /> Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <Pagination
          currentPage={data?.pagination?.page || 1}
          totalPages={data?.pagination?.totalPages || 1}
          totalItems={data?.pagination?.total || 0}
          limit={filters.limit}
          onPageChange={(p) => setFilters((curr) => ({ ...curr, page: p }))}
          onLimitChange={(l) => setFilters((curr) => ({ ...curr, limit: l, page: 1 }))}
          itemLabel="returns"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

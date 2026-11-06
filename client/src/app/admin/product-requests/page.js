"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaEye,
  FaTrashAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaBoxOpen,
} from "react-icons/fa";
import { productRequestService } from "@/services/productRequestService";
import Pagination from "@/components/admin/Pagination";
import ViewProductRequestModal from "@/components/admin/product-requests/ViewProductRequestModal";

const STATUS_BADGES = {
  PENDING: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  IN_PROGRESS: {
    label: "In Progress",
    classes: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  FULFILLED: {
    label: "Fulfilled",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  REJECTED: {
    label: "Rejected",
    classes: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
};

export default function AdminProductRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    fulfilled: 0,
    rejected: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load requests & metrics
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [listRes, metricsRes] = await Promise.all([
        productRequestService.getAdminProductRequests({
          search,
          status,
          page,
          limit,
        }),
        productRequestService.getAdminProductRequestMetrics(),
      ]);

      setRequests(listRes.requests || []);
      setPagination(listRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setMetrics(metricsRes.data || { total: 0, pending: 0, inProgress: 0, fulfilled: 0, rejected: 0 });
    } catch (err) {
      setError(err.message || "Failed to load product requests.");
    } finally {
      setIsLoading(false);
    }
  }, [search, status, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id, payload) => {
    const updated = await productRequestService.updateAdminProductRequest(id, payload);
    // Refresh local item
    setRequests((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updated.data } : it))
    );
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest((prev) => ({ ...prev, ...updated.data }));
    }
    // Refresh metrics in background
    productRequestService.getAdminProductRequestMetrics().then((res) => {
      if (res?.data) setMetrics(res.data);
    }).catch(() => {});
  };

  const handleDelete = async (id) => {
    await productRequestService.deleteAdminProductRequest(id);
    loadData();
  };

  const openDetails = (req) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Product Requests
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] dark:text-rose-300">
              {metrics.total} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review customer product requests, requested shades, and sourcing status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <FaSyncAlt className={`text-xs ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">All Requests</span>
            <FaBoxOpen className="text-gray-400 text-sm" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {metrics.total}
          </p>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending Review</span>
            <FaHourglassHalf className="text-amber-500 text-sm" />
          </div>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-2">
            {metrics.pending}
          </p>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">In Progress</span>
            <FaClock className="text-blue-500 text-sm" />
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-2">
            {metrics.inProgress}
          </p>
        </div>

        {/* Fulfilled */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Fulfilled</span>
            <FaCheckCircle className="text-emerald-500 text-sm" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-2">
            {metrics.fulfilled}
          </p>
        </div>

        {/* Rejected */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Rejected</span>
            <FaTimesCircle className="text-gray-400 text-sm" />
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-300 mt-2">
            {metrics.rejected}
          </p>
        </div>
      </div>

      {/* ── Toolbar: Search & Status Filter Tabs ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "PENDING", label: `Pending (${metrics.pending})` },
              { id: "IN_PROGRESS", label: `In Progress (${metrics.inProgress})` },
              { id: "FULFILLED", label: `Fulfilled (${metrics.fulfilled})` },
              { id: "REJECTED", label: `Rejected (${metrics.rejected})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatus(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  status === tab.id
                    ? "bg-[#9B4F5E] text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search product, phone, email..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E]"
            />
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs border-b border-red-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Variant / Tone</th>
                <th className="py-3 px-4">Customer Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <FaBoxOpen className="mx-auto text-3xl mb-2 text-gray-300 dark:text-gray-700" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                      No product requests found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search || status !== "all"
                        ? "Try adjusting your search query or status filter."
                        : "Customer product requests will appear here once submitted."}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const badge = STATUS_BADGES[req.status] || STATUS_BADGES.PENDING;
                  const rawDigits = (req.customerPhone || "").replace(/\D/g, "");
                  const waNumber = rawDigits.startsWith("88") ? rawDigits : rawDigits.startsWith("0") ? `88${rawDigits}` : `880${rawDigits}`;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        <span className="font-medium text-gray-700 dark:text-gray-300 block">
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900 dark:text-white max-w-xs truncate" title={req.productName}>
                          {req.productName}
                        </p>
                        {req.notes && (
                          <p className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5" title={req.notes}>
                            Note: {req.notes}
                          </p>
                        )}
                      </td>

                      {/* Variant / Tone */}
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {req.variantText ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-rose-300 font-medium text-[11px]">
                            {req.variantText}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Customer Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${req.customerPhone}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-[#9B4F5E] flex items-center gap-1"
                          >
                            <FaPhoneAlt className="text-[10px] text-gray-400" />
                            <span>{req.customerPhone}</span>
                          </a>
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="WhatsApp"
                          >
                            <FaWhatsapp />
                          </a>
                        </div>
                        {req.customerEmail && (
                          <a
                            href={`mailto:${req.customerEmail}`}
                            className="text-[11px] text-gray-500 hover:text-[#9B4F5E] flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                            title={req.customerEmail}
                          >
                            <FaEnvelope className="text-[9px] text-gray-400 shrink-0" />
                            <span className="truncate">{req.customerEmail}</span>
                          </a>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetails(req)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#9B4F5E] hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors cursor-pointer"
                            title="View & Edit Details"
                          >
                            <FaEye className="text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete request for "${req.productName}"?`)) {
                                handleDelete(req.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Request"
                          >
                            <FaTrashAlt className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ── View / Edit Modal ── */}
      <ViewProductRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />
    </div>
  );
}


"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminOrderService } from "@/services/adminOrderService";
import Pagination from "@/components/admin/Pagination";

const labels = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const statusColors = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  returned: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function AdminOrdersPage() {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await adminOrderService.list(filters));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      setIsLoading(true);
      try {
        const result = await adminOrderService.list(filters);
        if (active) setData(result);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadOrders();
    return () => { active = false; };
  }, [filters]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Operations</p>
        <h1 className="mt-1 text-2xl font-bold">Orders Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review customer orders, transition fulfillment statuses, manage courier tracking, and audit history.
        </p>
      </header>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["All orders", "all_orders", "all"],
          ["Pending", "pending", "pending"],
          ["Confirmed", "confirmed", "confirmed"],
          ["Processing", "processing", "processing"],
          ["Shipped", "shipped", "shipped"],
          ["Delivered", "delivered", "delivered"],
          ["Cancelled", "cancelled", "cancelled"],
          ["Returned", "returned", "returned"],
        ].map(([label, key, value]) => (
          <button
            key={key}
            onClick={() => setFilter("status", value)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              filters.status === value
                ? "border-[#9B4F5E] bg-[#FBF0F0] text-gray-900 dark:border-[#A46377] dark:bg-[#3b2430] dark:text-gray-100"
                : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-xl font-bold">{data?.summary?.[key] ?? "—"}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={filters.search}
          onChange={(event) => setFilter("search", event.target.value)}
          placeholder="Search by order number, customer name, phone, or tracking..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
        <select
          value={filters.sortBy}
          onChange={(event) => setFilter("sortBy", event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <option value="date">Newest first</option>
          <option value="total">Order total</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <tr>
                {["Order", "Customer", "Date", "Items", "Total", "Status", "Delivery Area / Courier", "Action"].map((heading) => (
                  <th key={heading} className="px-5 py-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.orders?.length > 0 ? (
                data.orders.map((order) => {
                  const s = order.status?.toLowerCase() || "pending";
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.customerPhone || order.customerEmail || "Guest"}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {new Date(order.placedAt || order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{order.itemCount}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">
                        {money(order.grandTotal || order.totalAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[s] || "bg-gray-100 text-gray-700"}`}>
                          {labels[s] || s}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        <div>{order.deliveryArea || "—"}</div>
                        {order.courierName && (
                          <div className="mt-0.5 text-[11px] text-[#9B4F5E] font-medium">
                            {order.courierName} {order.trackingNumber ? `(${order.trackingNumber})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link className="font-semibold text-[#9B4F5E] hover:underline" href={`/admin/orders/${order.id}`}>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : null}
            </tbody>
          </table>
        </div>
        {data?.orders?.length === 0 && !isLoading && (
          <p className="p-10 text-center text-sm text-gray-500">No orders found matching the filter criteria.</p>
        )}

        {/* ── Table Pagination ── */}
        <Pagination
          currentPage={data?.pagination?.page || 1}
          totalPages={data?.pagination?.totalPages || 1}
          totalItems={data?.pagination?.total || 0}
          limit={filters.limit}
          onPageChange={(p) => setFilters((curr) => ({ ...curr, page: p }))}
          onLimitChange={(l) => setFilters((curr) => ({ ...curr, limit: l, page: 1 }))}
          itemLabel="orders"
          isLoading={isLoading}
          variant="attached"
        />
      </div>
    </div>
  );
}

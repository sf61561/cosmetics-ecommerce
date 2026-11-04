"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaShoppingBag } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { orderService } from "@/services/orderService";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const statusColors = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  returned: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const statusLabels = {
  pending: "Pending Review",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(() => {
    setIsLoading(true);
    setError("");
    return orderService.list()
      .then((data) => setOrders(data || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <ProfileLayout title="My orders" description="Review your purchases, track live shipping status, or manage order details.">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadOrders} className="font-semibold underline">Try again</button>
        </div>
      )}
      {isLoading ? (
        <div role="status" className="rounded-3xl bg-white p-10 text-center text-sm text-gray-500 dark:bg-gray-900">
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-[#9B4F5E] border-t-transparent" />
          <span className="mt-4 block">Loading your orders...</span>
        </div>
      ) : orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const canonicalStatus = order.status || order.orderStatus?.toLowerCase() || "pending";
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-3xl border border-[#eee6ee] bg-white p-5 shadow-xs transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order {order.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Placed on {new Date(order.placedAt || order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusColors[canonicalStatus] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabels[canonicalStatus] || order.orderStatus}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                  <span className="text-gray-500 text-xs">
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{money(order.grandTotal || order.totalAmount)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-10 text-center shadow-xs dark:bg-gray-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E5ED] text-[#9B4F5E]">
            <FaShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No orders placed yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Your purchases will appear here once you place an order.</p>
          <Link href="/shop" className="mt-6 inline-flex rounded-full bg-[#9B4F5E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#843F4E]">
            Start shopping
          </Link>
        </div>
      )}
    </ProfileLayout>
  );
}

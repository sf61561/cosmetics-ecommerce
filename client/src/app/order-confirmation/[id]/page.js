"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { orderService } from "@/services/orderService";
import { useCart } from "@/context/CartContext";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const { refreshCart } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Sync cart to ensure bag is empty in client state
    refreshCart().catch(() => {});

    orderService.getById(id)
      .then(setOrder)
      .catch((requestError) => setError(requestError.message));
  }, [id, refreshCart]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {!order && !error && (
          <p className="py-16 text-center text-sm text-gray-500">Loading order confirmation...</p>
        )}
        {order && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 text-center shadow-xs dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/30">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-2xl font-bold">
                ✓
              </div>
              <h1 className="mt-4 font-serif text-3xl font-bold text-gray-900 dark:text-gray-100">
                Order Placed Successfully!
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Order <span className="font-semibold text-gray-800 dark:text-gray-200">{order.orderNumber}</span> is now <span className="font-semibold text-[#9B4F5E]">Pending Review</span>
              </p>
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-xs dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Order Items</h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {order.items.map((item) => (
                  <div key={`${item.productName}-${item.sku}`} className="flex justify-between py-3 text-sm">
                    <span className="text-gray-800 dark:text-gray-200">
                      {item.productName} <span className="text-gray-400">× {item.quantity}</span>
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{money(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{money(order.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery Charge</span>
                  <span>{money(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-gray-100">
                  <span>Grand Total</span>
                  <span className="text-[#9B4F5E]">{money(order.grandTotal)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-xs dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Delivery Address</h2>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                <strong>{order.shipping?.name}</strong><br />
                {order.shipping?.phone}<br />
                {order.shipping?.address}, {order.shipping?.area}, {order.shipping?.city}
                {order.shipping?.postalCode ? ` - ${order.shipping?.postalCode}` : ""}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
                <span>Fulfillment Status: <strong className="capitalize text-[#9B4F5E]">{order.status}</strong></span>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/track-order?code=${order.trackingNumber || order.orderNumber || order.id}`}
                className="rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#843F4E]"
              >
                Track order & view timeline
              </Link>
              <Link
                href="/orders"
                className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                All my orders
              </Link>
              <Link
                href="/shop"
                className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400"
              >
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

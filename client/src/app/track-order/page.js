"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FaSearch,
  FaTruck,
  FaCheckCircle,
  FaBoxOpen,
  FaClipboardCheck,
  FaHome,
  FaTimesCircle,
  FaSpinner,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegCopy,
  FaCheck,
  FaShieldAlt,
  FaArrowLeft,
} from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { orderService } from "@/services/orderService";

const money = (val) =>
  `৳${Number(val || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

// 5 Canonical Delivery Steps
const STEPS = [
  {
    key: "pending",
    label: "Order Placed",
    desc: "Order received and queued",
    icon: FaClipboardCheck,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    desc: "Verified & inventory allocated",
    icon: FaCheckCircle,
  },
  {
    key: "processing",
    label: "Processing",
    desc: "Carefully packed & sealed",
    icon: FaBoxOpen,
  },
  {
    key: "shipped",
    label: "In Transit",
    desc: "Handed over to courier",
    icon: FaTruck,
  },
  {
    key: "delivered",
    label: "Delivered",
    desc: "Package handed to recipient",
    icon: FaHome,
  },
];

function getStepIndex(status) {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "pending":
    case "placed":
      return 0;
    case "confirmed":
      return 1;
    case "processing":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return 0;
  }
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryCode =
    searchParams.get("code") ||
    searchParams.get("trackingNumber") ||
    searchParams.get("orderNumber") ||
    searchParams.get("q") ||
    "";

  const [inputVal, setInputVal] = useState(queryCode);
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const performSearch = useCallback(async (codeToSearch) => {
    const trimmed = (codeToSearch || "").trim();
    if (!trimmed) return;

    setIsLoading(true);
    setErrorMsg("");
    setHasSearched(true);

    try {
      const data = await orderService.track(trimmed);
      if (data) {
        setOrder(data);
      } else {
        setOrder(null);
        setErrorMsg("No order found matching this tracking or order number.");
      }
    } catch (err) {
      setOrder(null);
      setErrorMsg(
        err.message ||
          "No order found with this tracking number. Please verify the code in your confirmation SMS or email."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-search on page load if query param is present
  useEffect(() => {
    if (queryCode) {
      setInputVal(queryCode);
      performSearch(queryCode);
    }
  }, [queryCode, performSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    router.push(`/track-order?code=${encodeURIComponent(inputVal.trim())}`);
    performSearch(inputVal);
  };

  const handleCopy = (text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCancelled = order?.status === "cancelled";
  const isReturned = order?.status === "returned";
  const currentStepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* ── Breadcrumb ── */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Return to Storefront</span>
          </Link>
        </div>

        {/* ── Page Header & Search Bar ── */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#9B4F5E] dark:text-rose-300 uppercase">
            <FaTruck className="text-[10px]" />
            <span>ORDER TRACKING</span>
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white tracking-tight">
            Track Your Package
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto">
            Enter your <strong>Order Number</strong> or <strong>Courier Tracking Number</strong> to view real-time delivery progress.
          </p>

          {/* Search Bar Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 max-w-xl mx-auto"
          >
            <div className="relative w-full flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm" />
              <input
                type="text"
                required
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. ORD-20261103-5617 or TRK-..."
                className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-11 pr-4 py-3.5 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 focus:outline-hidden transition-all shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="w-full sm:w-auto rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] px-7 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin text-xs" />
              ) : (
                <FaTruck className="text-xs" />
              )}
              <span>{isLoading ? "Searching..." : "Track Order"}</span>
            </button>
          </form>
        </section>

        {/* ── Results Container ── */}
        <section className="mt-10 sm:mt-12">
          {isLoading ? (
            <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-12 text-center space-y-3">
              <FaSpinner className="animate-spin text-2xl text-[#9B4F5E] mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Retrieving live order and courier status...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="rounded-3xl bg-white dark:bg-gray-900 border border-red-200/80 dark:border-red-900/40 p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-3">
              <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto text-xl">
                <FaTimesCircle />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                Order Not Found
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {errorMsg}
              </p>
              <div className="pt-3 text-[11px] text-gray-400">
                <p>
                  Need help locating your order? Contact customer care at{" "}
                  <a
                    href="mailto:support@eloura.com"
                    className="text-[#9B4F5E] font-medium underline"
                  >
                    support@eloura.com
                  </a>
                </p>
              </div>
            </div>
          ) : order ? (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              {/* Order Meta Header Card */}
              <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      Order {order.orderNumber}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        order.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : order.status === "cancelled" || order.status === "returned"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                          : "bg-rose-50 text-[#9B4F5E] dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Placed on {formatDate(order.placedAt)}
                  </p>
                </div>

                {/* Courier / Tracking Code Badge */}
                {order.trackingNumber && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shrink-0">
                    <FaTruck className="text-[#9B4F5E] text-sm shrink-0" />
                    <div className="text-left text-xs">
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        {order.courierName || "Courier Partner"}
                      </span>
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                        {order.trackingNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.trackingNumber)}
                      className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      {copied ? (
                        <FaCheck className="text-emerald-500 text-xs" />
                      ) : (
                        <FaRegCopy className="text-xs" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Cancelled / Returned Warning Card (if applicable) ── */}
              {isCancelled && (
                <div className="rounded-3xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-6 flex items-start gap-3">
                  <FaTimesCircle className="text-red-500 text-lg shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-900 dark:text-red-200 text-sm">
                      Order Cancelled
                    </h3>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                      This order was cancelled. No delivery will be dispatched. If you paid or need assistance, please contact customer support.
                    </p>
                  </div>
                </div>
              )}

              {isReturned && (
                <div className="rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-6 flex items-start gap-3">
                  <FaTimesCircle className="text-amber-500 text-lg shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      Order Returned
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      This parcel was returned to our fulfillment warehouse.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Visual Stepper Section ── */}
              {!isCancelled && !isReturned && (
                <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-10 shadow-xs">
                  <div className="mb-6 flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        Delivery Progress
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Estimated arrival:{" "}
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {order.shipping?.zone === "INSIDE_DHAKA"
                            ? "2 – 3 Business Days"
                            : "3 – 5 Business Days"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Desktop Horizontal Stepper */}
                  <div className="hidden sm:block">
                    <div className="relative flex items-start justify-between">
                      {/* Background Connector Bar */}
                      <div className="absolute top-5 left-6 right-6 h-1 bg-gray-200 dark:bg-gray-800 -z-0">
                        <div
                          className="h-full bg-linear-to-r from-[#9B4F5E] to-rose-400 transition-all duration-500"
                          style={{
                            width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        const isUpcoming = idx > currentStepIdx;

                        return (
                          <div
                            key={step.key}
                            className="relative z-10 flex flex-col items-center text-center max-w-[120px]"
                          >
                            {/* Step Circle Indicator */}
                            <div
                              className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
                                isCompleted
                                  ? "bg-[#9B4F5E] text-white shadow-xs"
                                  : isCurrent
                                  ? "bg-[#9B4F5E] text-white ring-4 ring-[#9B4F5E]/20 shadow-md"
                                  : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-400"
                              }`}
                            >
                              <Icon className="text-sm" />
                            </div>

                            {/* Label & Description */}
                            <div className="mt-3">
                              <span
                                className={`block text-xs font-bold ${
                                  isCurrent
                                    ? "text-[#9B4F5E] dark:text-rose-300"
                                    : isCompleted
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Vertical Stepper */}
                  <div className="block sm:hidden space-y-6 relative pl-3">
                    <div className="absolute top-4 bottom-4 left-7 w-0.5 bg-gray-200 dark:bg-gray-800" />
                    {STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={step.key} className="relative flex items-start gap-4">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 z-10 ${
                              isCompleted
                                ? "bg-[#9B4F5E] text-white"
                                : isCurrent
                                ? "bg-[#9B4F5E] text-white ring-4 ring-[#9B4F5E]/20"
                                : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-400"
                            }`}
                          >
                            <Icon className="text-xs" />
                          </div>

                          <div className="pt-1">
                            <span
                              className={`block text-xs font-bold ${
                                isCurrent
                                  ? "text-[#9B4F5E] dark:text-rose-300"
                                  : isCompleted
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-400"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                              {step.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Two-Column Details: Shipping & Order Contents ── */}
              <div className="grid gap-6 lg:grid-cols-12 items-start">
                {/* Left: Shipping Destination & Courier (6 cols) */}
                <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-7 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#9B4F5E] text-xs" />
                    <span>Delivery Details</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Recipient Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {order.shipping?.recipientName || "Valued Customer"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Contact Phone</span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {order.shipping?.phone || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Destination</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right max-w-[200px]">
                        {[order.shipping?.area, order.shipping?.city].filter(Boolean).join(", ")}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Payment Mode</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Cash on Delivery
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500 dark:text-gray-400">Courier Partner</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {order.courierName || "Elourá Logistics / Courier"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Items in Package & Bill Summary (6 cols) */}
                <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-7 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white">
                    Package Items ({order.items?.length || 0})
                  </h3>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto pr-1">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center gap-3">
                        {item.imageUrl ? (
                          <div className="relative h-12 w-12 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 text-xs">
                            <FaBoxOpen />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Qty: {item.quantity} × {money(item.unitPrice)}
                          </p>
                        </div>

                        <span className="text-xs font-bold text-gray-900 dark:text-white shrink-0">
                          {money(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Total */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {money(order.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Fee</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {money(order.shippingFee)}
                      </span>
                    </div>

                    {order.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount</span>
                        <span>-{money(order.discountTotal)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-baseline font-bold">
                      <span className="text-gray-900 dark:text-white">Total Amount Due</span>
                      <span className="font-serif text-base text-[#9B4F5E] dark:text-rose-300">
                        {money(order.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Reassurance Callout */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4 text-xs text-center flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                <FaShieldAlt className="text-emerald-500" />
                <span>100% Authentic Korean Cosmetics • Verified Delivery Guarantee</span>
              </div>
            </div>
          ) : !hasSearched ? (
            /* ── Default Guide State (Before Searching) ── */
            <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
              <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] flex items-center justify-center mx-auto text-2xl">
                <FaTruck />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                How to find your tracking code
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Check your <strong>Order Confirmation SMS</strong> or visit your account’s{" "}
                <Link href="/orders" className="text-[#9B4F5E] font-semibold underline">
                  My Orders
                </Link>{" "}
                page to find your order number (e.g. <code>ORD-20261103-5617</code>) or courier consignment tracking code.
              </p>
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
          <Navbar />
          <div className="flex-1 flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-2xl text-[#9B4F5E]" />
          </div>
          <Footer />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}


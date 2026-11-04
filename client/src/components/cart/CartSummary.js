"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaLock,
  FaShieldAlt,
  FaTruck,
  FaTag,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaArrowRight,
} from "react-icons/fa";
import { promotionService } from "@/services/promotionService";

export default function CartSummary({ cart, onNotify }) {
  const [deliveryZone, setDeliveryZone] = useState("dhaka");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [quote, setQuote] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const subtotal = cart.subtotal || 0;
  const discountFromCoupon = quote?.couponDiscount || 0;
  const finalTotal = quote?.finalTotal ?? subtotal;
  const totalSavings = (cart.totalDiscount || 0) + discountFromCoupon;
  const appliedCode = appliedCoupon?.code || "";

  useEffect(() => {
    let isSubscribed = true;
    async function calculateQuote() {
      if (!cart.items?.length) {
        setQuote(null);
        return;
      }
      setIsCalculating(true);
      try {
        const response = await promotionService.calculateCart({
          zone: deliveryZone === "dhaka" ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA",
          code: appliedCode,
        });
        if (isSubscribed) setQuote(response.data);
      } catch (error) {
        if (isSubscribed && appliedCode) {
          setAppliedCoupon(null);
          setCouponError(error.message);
        }
      } finally {
        if (isSubscribed) setIsCalculating(false);
      }
    }
    calculateQuote();
    return () => {
      isSubscribed = false;
    };
  }, [cart.items, deliveryZone, appliedCode]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError("");

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a voucher code.");
      return;
    }
    try {
      setIsCalculating(true);
      const response = await promotionService.calculateCart({
        zone: deliveryZone === "dhaka" ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA",
        code,
      });
      setAppliedCoupon({ code: response.data.coupon.code });
      setQuote(response.data);
      if (onNotify) onNotify(`Coupon ${response.data.coupon.code} applied.`);
    } catch (error) {
      setCouponError(error.message || "Unable to apply this coupon.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    if (onNotify) onNotify("Voucher removed.");
  };

  const isCheckoutDisabled = cart.hasBlockingIssues || cart.items.length === 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm sticky top-24">
      <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white tracking-tight mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        Order Summary
      </h3>

      {/* Pricing Breakdown */}
      <div className="space-y-3.5 text-sm">
        {/* Original Retail (if discounts exist) */}
        {cart.totalDiscount > 0 && (
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span>Original Total</span>
            <span className="line-through">৳{cart.regularSubtotal?.toLocaleString()}</span>
          </div>
        )}

        {/* Bag Subtotal */}
        <div className="flex items-center justify-between text-gray-700 dark:text-gray-200">
          <span>Subtotal ({cart.itemCount || 0} items)</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ৳{subtotal.toLocaleString()}
          </span>
        </div>

        {/* Product Catalog Savings */}
        {cart.totalDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <FaTag className="text-xs" />
              <span>Catalog Savings</span>
            </span>
            <span className="font-semibold">-৳{cart.totalDiscount?.toLocaleString()}</span>
          </div>
        )}

        {/* Applied Coupon Savings */}
        {appliedCoupon && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-xl">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <FaCheckCircle className="text-xs" />
              <span>Coupon ({appliedCoupon.code})</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">-৳{discountFromCoupon.toLocaleString()}</span>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleRemoveCoupon}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove Coupon"
              >
                <FaTimesCircle className="text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* Delivery Estimation Zone */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
            Delivery Destination
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setDeliveryZone("dhaka")}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                deliveryZone === "dhaka"
                  ? "border-[#9B4F5E] bg-rose-50/50 dark:bg-rose-950/20 text-[#9B4F5E] dark:text-rose-300 font-semibold shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Inside Dhaka</span>
                <span className="font-bold">
                  {deliveryZone === "dhaka" && quote ? `৳${quote.deliveryCharge.toLocaleString()}` : "—"}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                {(deliveryZone === "dhaka" && quote?.estimatedDeliveryTime) || "Configured at checkout"}
              </span>
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setDeliveryZone("outside")}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                deliveryZone === "outside"
                  ? "border-[#9B4F5E] bg-rose-50/50 dark:bg-rose-950/20 text-[#9B4F5E] dark:text-rose-300 font-semibold shadow-xs"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Outside Dhaka</span>
                <span className="font-bold">
                  {deliveryZone === "outside" && quote ? `৳${quote.deliveryCharge.toLocaleString()}` : "—"}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                {(deliveryZone === "outside" && quote?.estimatedDeliveryTime) || "Configured at checkout"}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <FaInfoCircle className="text-[10px] shrink-0" />
            <span>Final shipping confirmed with exact address at checkout.</span>
          </p>
        </div>

        {/* Voucher Input */}
        {!appliedCoupon && (
          <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                suppressHydrationWarning
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Voucher code (e.g. ELOURA10)"
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E]"
              />
              <button
                type="submit"
                suppressHydrationWarning
                disabled={isCalculating}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-white transition-colors cursor-pointer disabled:opacity-60"
              >
                {isCalculating ? "Checking..." : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 mt-1.5">{couponError}</p>
            )}
          </form>
        )}

        {/* Total Price Section */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-serif text-base font-semibold text-gray-900 dark:text-white">
              Estimated Total
            </span>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ৳{finalTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-400 block">VAT included</span>
            </div>
          </div>

          {totalSavings > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-right mb-4">
              🎉 You are saving ৳{totalSavings.toLocaleString()} on this order!
            </p>
          )}
        </div>

        {/* Checkout Button */}
        {isCheckoutDisabled ? (
          <button
            type="button"
            disabled
            className="w-full py-4 px-6 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
          >
            <FaLock className="text-xs" />
            <span>
              {cart.items.length === 0 ? "Shopping Bag is Empty" : "Resolve Stock Alerts to Continue"}
            </span>
          </button>
        ) : (
          <Link
            href="/checkout"
            className="w-full py-4 px-6 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <FaLock className="text-xs" />
            <span>Proceed to Checkout</span>
            <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {/* Trust Badges */}
        <div className="pt-4 space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-xs text-emerald-600 shrink-0" />
            <span>100% Genuine Product Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <FaTruck className="text-xs text-blue-600 shrink-0" />
            <span>Cash on Delivery (COD) available across Bangladesh</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { FaShoppingBag, FaArrowRight, FaShieldAlt, FaTruck, FaUndo } from "react-icons/fa";

export default function EmptyCartView() {
  return (
    <div className="py-12 sm:py-20 text-center max-w-2xl mx-auto px-4">
      {/* Icon with soft blush glow */}
      <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-rose-50 dark:bg-rose-950/30 text-[#9B4F5E] dark:text-rose-300 ring-8 ring-rose-50/50 dark:ring-rose-950/10 transition-transform duration-300 hover:scale-105">
        <FaShoppingBag className="w-10 h-10" />
      </div>

      {/* Headline & Body */}
      <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mb-3">
        Your Shopping Bag is Empty
      </h2>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8 leading-relaxed">
        Discover the most loved Korean skincare rituals and handpicked formulations waiting for you.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <span>Explore Curated Collections</span>
          <FaArrowRight className="text-xs" />
        </Link>
        <Link
          href="/#new-arrivals"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors cursor-pointer"
        >
          <span>View New Arrivals</span>
        </Link>
      </div>

      {/* Trust Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-gray-200 dark:border-gray-800 text-left">
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <div className="p-2 rounded-xl bg-white dark:bg-gray-900 text-[#9B4F5E] dark:text-rose-300 shrink-0 shadow-xs">
            <FaShieldAlt className="text-sm" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">100% Authentic</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Directly sourced from verified Korean brands</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <div className="p-2 rounded-xl bg-white dark:bg-gray-900 text-[#9B4F5E] dark:text-rose-300 shrink-0 shadow-xs">
            <FaTruck className="text-sm" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Fast Delivery</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Inside Dhaka in 24-48h, Nationwide in 3-5 days</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
          <div className="p-2 rounded-xl bg-white dark:bg-gray-900 text-[#9B4F5E] dark:text-rose-300 shrink-0 shadow-xs">
            <FaUndo className="text-sm" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Easy Returns</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Hassle-free 7-day refund or replacement policy</p>
          </div>
        </div>
      </div>
    </div>
  );
}


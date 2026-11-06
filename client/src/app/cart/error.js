"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FaShoppingBag, FaRedo, FaArrowLeft } from "react-icons/fa";

export default function CartError({ error, reset }) {
  useEffect(() => {
    console.error("CartPage Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-10 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] dark:text-rose-300 ring-8 ring-rose-50/50 dark:ring-rose-950/20">
            <FaShoppingBag className="w-8 h-8" />
          </div>

          <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Unable to Load Your Bag
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            We encountered a temporary hiccup while retrieving your shopping bag items. Your saved selections are safe.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>Try Again</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FaArrowLeft className="text-xs" />
              <span>Return to Shop</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


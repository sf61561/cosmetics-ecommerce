"use client";

import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ProductNotFoundState({ error }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 max-w-xl mx-auto px-4 py-24 sm:py-32 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-pink-50 dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-300 flex items-center justify-center mx-auto text-2xl shadow-xs border border-pink-100 dark:border-gray-700">
          ✨
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl text-gray-900 dark:text-white font-normal">
            Product Currently Unavailable
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {error ||
              "The specific skincare formulation you are looking for has been archived, scheduled, or does not exist."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#843f4e] transition-colors shadow-xs"
          >
            <FaArrowLeft className="h-3 w-3" />
            Explore Curated Collections
          </Link>
          <Link
            href="/brands"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
          >
            Discover All Brands
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}


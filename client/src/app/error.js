"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FaRedo, FaHome } from "react-icons/fa";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F5] dark:bg-gray-950 px-4 py-16 text-gray-900 dark:text-gray-100">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-10 border border-pink-100 dark:border-gray-800 shadow-xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B4F5E] dark:text-pink-400 block mb-2">
          ELOURA BEAUTY
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          An unexpected error occurred while loading this page. Please refresh or return to the homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <FaRedo className="text-xs" />
            <span>Reload Page</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FaHome className="text-xs" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

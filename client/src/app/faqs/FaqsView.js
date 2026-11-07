"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useProductRequest } from "@/context/ProductRequestContext";
import { FAQ_DATA } from "./faqData";
import {
  IoSearchOutline,
  IoChevronDown,
  IoShieldCheckmarkOutline,
  IoAirplaneOutline,
  IoRepeatOutline,
  IoSparklesOutline,
  IoHelpCircleOutline,
} from "react-icons/io5";

const CATEGORIES = [
  { label: "All", icon: IoHelpCircleOutline },
  { label: "Authenticity & Sourcing", icon: IoShieldCheckmarkOutline },
  { label: "Shipping & Delivery", icon: IoAirplaneOutline },
  { label: "Returns & Exchanges", icon: IoRepeatOutline },
  { label: "Product Guidance", icon: IoSparklesOutline },
];

export default function FaqsView() {
  const { openProductRequest } = useProductRequest();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState({ "auth-1": true });

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* ── Breadcrumb ── */}
      <nav
        className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-6"
        aria-label="Breadcrumb"
      >
        <Link
          href="/"
          className="hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors"
        >
          Home
        </Link>
        <span className="mx-2 text-gray-300 dark:text-gray-600">›</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">
          FAQs
        </span>
      </nav>

      {/* ── Header ── */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
          Quick answers to help you navigate authenticity, delivery timelines,
          returns, and personalized skincare support at Elourá.
        </p>
      </div>

      {/* ── Live Search Bar ── */}
      <div className="relative max-w-xl mx-auto mb-8">
        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions (e.g. delivery, authentic, returns, request)..."
          className="w-full h-12 pl-12 pr-4 rounded-full border border-[#F2E8E6] dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#9B4F5E]/30 focus:border-[#9B4F5E] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.label;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCategory(cat.label)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-[#9B4F5E] text-white shadow-xs"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-[#9B4F5E]/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Accordion List ── */}
      <div className="space-y-3 mb-14">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-10 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              No questions found matching &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="text-xs font-semibold text-[#9B4F5E] hover:underline"
            >
              Reset filters & search
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = !!openItems[faq.id];
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-[#F2E8E6] dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-2xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer focus:outline-none"
                >
                  <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white pr-4 leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF0F2] dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <IoChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-gray-100 dark:border-gray-800/60">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>

                    {faq.link && (
                      <div className="mt-3">
                        <Link
                          href={faq.link.href}
                          className="inline-flex items-center text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:underline"
                        >
                          {faq.link.text}
                        </Link>
                      </div>
                    )}

                    {faq.action === "request-product" && (
                      <div className="mt-3.5">
                        <button
                          type="button"
                          onClick={() => openProductRequest()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#9B4F5E] hover:bg-[#843f4e] transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Request a Product Now</span>
                          <span className="text-sm leading-none">✿</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Still Have Questions CTA Card ── */}
      <div className="rounded-3xl border border-[#F2E8E6] dark:border-gray-800 bg-white dark:bg-gray-900 p-8 sm:p-10 text-center shadow-xs">
        <h3 className="font-serif text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-2">
          Still have questions?
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
          We&apos;re here to help you with skin advice, order tracking, or
          sourcing rare Korean formulations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#9B4F5E] hover:bg-[#843f4e] transition-all shadow-xs"
          >
            Contact Customer Support
          </Link>
          <button
            type="button"
            onClick={() => openProductRequest()}
            className="px-6 py-2.5 rounded-full text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            Request a Product ✿
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import ProductReviewsSection from "./ProductReviewsSection";
import {
  FaCheckCircle,
  FaLeaf,
  FaClock,
  FaShieldAlt,
  FaTruck,
  FaUndo,
  FaWhatsapp,
  FaStar,
} from "react-icons/fa";

export default function ProductTabs({ product }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Parse comma-separated ingredients into chips for visual clarity
  const ingredientList = product.ingredients
    ? product.ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const tabs = [
    { id: "overview", label: "Overview & Formulation" },
    { id: "ingredients", label: "Ingredients" },
    { id: "how-to-use", label: "How to Use" },
    { id: "specs", label: "Specifications" },
    { id: "shipping", label: "Shipping & Delivery" },
    { id: "reviews", label: `Customer Reviews (${product.reviewCount || 0})` },
  ];

  return (
    <section id="customer-reviews" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100 dark:border-gray-800">
      {/* ── Tab Navigation Bar ── */}
      <div
        role="tablist"
        aria-label="Product information tabs"
        className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-gray-200 dark:border-gray-800 scrollbar-none"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              suppressHydrationWarning
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#9B4F5E] text-white shadow-xs"
                  : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ── */}
      <div className="pt-8">
        {/* Panel 1: Overview */}
        {activeTab === "overview" && (
          <div
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            className="space-y-6 max-w-4xl"
          >
            <div className="space-y-4">
              <h3 className="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-normal">
                Product Formulation & Clinical Highlights
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {product.description || product.shortDescription || "No detailed description provided."}
              </p>
            </div>

            {product.skinConcerns && (
              <div className="rounded-2xl bg-[#FAF7F5] dark:bg-gray-900/60 p-5 border border-pink-100/60 dark:border-gray-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9B4F5E] dark:text-pink-400">
                  Target Skin Concerns
                </span>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {product.skinConcerns}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <FaCheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">Barrier Reinforcement</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Restores damaged dermal layers and locks in long-lasting hydration.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <FaLeaf className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">Non-Comedogenic</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Lightweight texture crafted without pore-clogging heavy waxes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <FaShieldAlt className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">Authentic Sourcing</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Imported with verifiable manufacturer batch codes and security seals.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Ingredients */}
        {activeTab === "ingredients" && (
          <div
            id="panel-ingredients"
            role="tabpanel"
            aria-labelledby="tab-ingredients"
            className="space-y-6 max-w-4xl"
          >
            <div className="space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-normal">
                Full Formulation & Ingredients List
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Full INCI ingredient transparency. Formulated to meet clean skincare standards.
              </p>
            </div>

            {/* Ingredient Badges */}
            {ingredientList.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 block">
                  Highlighted Actives
                </span>
                <div className="flex flex-wrap gap-2">
                  {ingredientList.map((ing, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-pink-50/70 dark:bg-gray-900 border border-pink-100/60 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Formulation Box */}
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 p-5 border border-gray-200/70 dark:border-gray-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Complete INCI Composition
              </span>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-mono">
                {product.ingredients || "Ingredient details currently unavailable for this batch."}
              </p>
            </div>
          </div>
        )}

        {/* Panel 3: How to Use */}
        {activeTab === "how-to-use" && (
          <div
            id="panel-how-to-use"
            role="tabpanel"
            aria-labelledby="tab-how-to-use"
            className="space-y-6 max-w-4xl"
          >
            <div className="space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-normal">
                Application Ritual & How to Use
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maximize the efficacy of this formulation with the following routine order.
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAF7F5] dark:bg-gray-900/60 p-6 border border-pink-100/60 dark:border-gray-800 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Cleanse & Prep</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Start with a gentle low-pH cleanser followed by your favorite hydrating toner to balance your skin barrier.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Dispense & Press</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {product.howToUse ||
                      "Dispense an appropriate amount into palm or fingertips. Gently pat evenly over the face and neck until fully absorbed."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Lock in Moisture</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Follow with your preferred barrier moisturizer to seal in the actives. During the daytime, always finish with broad-spectrum SPF50+.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
              <FaClock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Recommended use: Twice daily (Morning and Night) or as needed in your skincare routine.</span>
            </div>
          </div>
        )}

        {/* Panel 4: Specifications */}
        {activeTab === "specs" && (
          <div
            id="panel-specs"
            role="tabpanel"
            aria-labelledby="tab-specs"
            className="space-y-6 max-w-4xl"
          >
            <h3 className="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-normal">
              Product Specifications & Details
            </h3>

            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {product.brand?.name && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400 w-1/3">Brand</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.brand.name}</td>
                    </tr>
                  )}
                  {product.collections && product.collections.length > 0 ? (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Collections</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">
                        {product.collections.map((c) => c.name).join(", ")}
                      </td>
                    </tr>
                  ) : product.category?.name ? (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Category</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.category.name}</td>
                    </tr>
                  ) : null}
                  {product.volume && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Volume / Net Weight</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.volume}</td>
                    </tr>
                  )}
                  {product.skinType && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Compatible Skin Type</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.skinType}</td>
                    </tr>
                  )}
                  {product.countryOfOrigin && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Country of Origin</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.countryOfOrigin}</td>
                    </tr>
                  )}
                  {product.expiryInfo && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Batch Expiry / PAO</td>
                      <td className="py-3 px-5 font-medium text-gray-900 dark:text-white">{product.expiryInfo}</td>
                    </tr>
                  )}
                  {product.sku && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">SKU Code</td>
                      <td className="py-3 px-5 font-mono text-gray-700 dark:text-gray-300">{product.sku}</td>
                    </tr>
                  )}
                  {product.barcode && (
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-3 px-5 font-semibold text-gray-500 dark:text-gray-400">Barcode (EAN/UPC)</td>
                      <td className="py-3 px-5 font-mono text-gray-700 dark:text-gray-300">{product.barcode}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Panel 5: Shipping & Delivery */}
        {activeTab === "shipping" && (
          <div
            id="panel-shipping"
            role="tabpanel"
            aria-labelledby="tab-shipping"
            className="space-y-6 max-w-4xl"
          >
            <div className="space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl text-gray-900 dark:text-white font-normal">
                Delivery & Returns Policy in Bangladesh
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reliable doorstep delivery nationwide across all 64 districts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-2.5 text-[#9B4F5E] dark:text-pink-400 font-bold text-sm">
                  <FaTruck className="h-4 w-4" />
                  <h4>Inside Dhaka Metropolitan</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Delivery fee: <span className="font-bold text-gray-900 dark:text-white">৳70</span>. Delivered within 24 to 48 hours via Pathao / Steadfast Courier. Same-day dispatch on orders placed before 2:00 PM.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-2.5 text-[#9B4F5E] dark:text-pink-400 font-bold text-sm">
                  <FaTruck className="h-4 w-4" />
                  <h4>Outside Dhaka (All Districts)</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Delivery fee: <span className="font-bold text-gray-900 dark:text-white">৳130</span>. Delivered within 3 to 5 business days to your district, thana or doorstep. Full tracking code provided via SMS.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F5] dark:bg-gray-900 border border-pink-100/60 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-2 text-[#9B4F5E] dark:text-pink-400 font-bold text-sm">
                <FaUndo className="h-4 w-4" />
                <h4>7-Day Authenticity & Return Guarantee</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                If an item is received damaged or defective, or if you change your mind while the tamper-evident packaging and hygiene seals remain intact, contact us within 7 days of delivery for an immediate replacement or full refund.
              </p>
            </div>
          </div>
        )}

        {/* Panel 6: Reviews */}
        {activeTab === "reviews" && (
          <div
            id="panel-reviews"
            role="tabpanel"
            aria-labelledby="tab-reviews"
            className="space-y-6 max-w-5xl"
          >
            <ProductReviewsSection product={product} />
          </div>
        )}
      </div>
    </section>
  );
}


"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FaTimes,
  FaEdit,
  FaBoxOpen,
  FaTag,
  FaGlobe,
  FaFlask,
  FaExternalLinkAlt,
  FaLayerGroup,
  FaCalendarAlt,
  FaBarcode,
  FaClock,
  FaSpinner,
  FaSearch,
  FaCheck,
  FaInfoCircle,
} from "react-icons/fa";
import { productService, parseHowToUseSteps } from "@/services/productService";

export default function ViewProductModal({ isOpen, onClose, product }) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [fullProduct, setFullProduct] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // When modal opens, fetch the complete product details (images, variants, formulation, specs)
  useEffect(() => {
    if (!isOpen || !product?.id) {
      setFullProduct(null);
      setSelectedImgIndex(0);
      return;
    }

    let isSubscribed = true;
    setIsLoadingDetails(true);

    productService
      .getAdminProductById(product.id)
      .then((res) => {
        if (isSubscribed && res?.success && res.data) {
          setFullProduct(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load full product details:", err);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  // Prefer full product from API once loaded, fallback to initial table row preview
  const p = fullProduct || product;

  // Media
  const images = p.images && p.images.length > 0 ? p.images : [];
  const primaryImg =
    images[selectedImgIndex] ||
    (p.thumbnailUrl ? { imageUrl: p.thumbnailUrl } : null) ||
    (images[0] ? images[0] : null);

  // Pricing & Margins
  const regularNum = parseFloat(p.price) || 0;
  const saleNum = parseFloat(p.salePrice) || 0;
  const costNum = parseFloat(p.costPrice) || 0;
  const hasDiscount = saleNum > 0 && saleNum < regularNum;
  const discountPercent = hasDiscount
    ? Math.round(((regularNum - saleNum) / regularNum) * 100)
    : 0;
  const profitMargin =
    regularNum > 0 && costNum > 0
      ? Math.round((((hasDiscount ? saleNum : regularNum) - costNum) / (hasDiscount ? saleNum : regularNum)) * 100)
      : null;

  // Formatted Dates
  const formattedUpdated = p.updatedAt
    ? new Date(p.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const formattedCreated = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const nonDefaultVariants =
    p.variants && p.variants.length > 0
      ? p.variants.filter((v) => v.optionsKey !== "default")
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Bounded Height (Strictly adhering to max-h-[85vh] rule) */}
      <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-100 dark:border-gray-800 z-10">
        
        {/* ── Modal Header (Pinned) ── */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 bg-gradient-to-r from-[#FBF0F0]/80 via-white to-white dark:from-gray-800/60 dark:via-gray-900 dark:to-gray-900">
          <div className="min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                {p.name}
              </h2>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                  p.status === "ACTIVE"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : p.status === "DRAFT"
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    p.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {p.status}
              </span>
              {/* Featured Badge */}
              {p.isFeatured && (
                <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  ★ Featured Item
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              <span>SKU: {p.sku || "N/A"}</span>
              {p.barcode && <span>• Barcode: {p.barcode}</span>}
              <span>• Slug: /{p.slug}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {p.slug && (
              <a
                href={`/products/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View live product on storefront"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>Storefront</span>
                <FaExternalLinkAlt className="h-2.5 w-2.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          
          {/* SECTION 1: Media Gallery & Commercial Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Gallery (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative aspect-square w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 overflow-hidden shadow-xs">
                {primaryImg?.imageUrl ? (
                  <Image
                    src={primaryImg.imageUrl}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="450px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#9B4F5E]/30">
                    <FaBoxOpen className="h-16 w-16" />
                  </div>
                )}
                {images.length > 1 && (
                  <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedImgIndex + 1} / {images.length}
                  </span>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`relative h-14 w-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                        selectedImgIndex === idx
                          ? "border-[#9B4F5E] shadow-xs scale-105"
                          : "border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img.imageUrl}
                        alt="thumbnail"
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Commercial & Catalog Details (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Pricing Card */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Pricing & Profitability
                </span>

                <div className="flex flex-wrap items-baseline gap-3 pt-1">
                  {p.hasVariants ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          From ৳{(p.minVariantPrice || regularNum).toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/50 px-2 py-0.5 rounded-full">
                          Multi-variant Pricing
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Individual variants have unique prices and stock levels detailed below.
                      </p>
                    </div>
                  ) : hasDiscount ? (
                    <>
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ৳{saleNum.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-gray-400 line-through">
                        ৳{regularNum.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ৳{regularNum.toLocaleString()}
                    </span>
                  )}
                </div>

                {costNum > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Internal Cost: <strong className="text-gray-800 dark:text-gray-200">৳{costNum.toLocaleString()}</strong>
                    </span>
                    {profitMargin !== null && (
                      <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md text-[11px]">
                        {profitMargin}% Gross Margin
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Organization & Taxonomy */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/30 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Brand & Taxonomy
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Partner Brand</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5 inline-block">
                      {p.brand?.name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 text-[11px] block">Country of Origin</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 inline-flex items-center gap-1.5">
                      <FaGlobe className="h-3 w-3 text-gray-400" />
                      {p.countryOfOrigin || "—"}
                    </span>
                  </div>
                </div>

                {/* Collections */}
                {p.collections && p.collections.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-400 text-[11px] block mb-1.5">Collection</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.collections.map((col) => (
                        <span
                          key={col.id}
                          className="inline-flex items-center gap-1 rounded-full bg-pink-50 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-900/50 px-2.5 py-0.5 text-[11px] font-medium text-[#9B4F5E] dark:text-pink-300"
                        >
                          <FaCheck className="h-2.5 w-2.5 text-[#9B4F5E]" />
                          {col.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Tags */}
                {p.tags && p.tags.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-400 text-[11px] block mb-1.5">Product Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 2: Short Description & Formulation Overview */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Product Overview & Summary
            </h3>

            {p.shortDescription ? (
              <div className="rounded-2xl border-l-4 border-l-[#9B4F5E] border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Short Summary
                </span>
                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">
                  &ldquo;{p.shortDescription}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No short summary provided.</p>
            )}

            {p.description && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                  Full Formulation & Description
                </span>
                <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/30 p-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line shadow-2xs">
                  {p.description}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Product Variants (If configured) */}
          {nonDefaultVariants.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E]">
                    <FaLayerGroup className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Product Variants ({nonDefaultVariants.length})
                  </h3>
                </div>
                {p.options?.[0]?.name && (
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Option Type: <strong className="text-gray-800 dark:text-gray-200">{p.options[0].name}</strong>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-2.5 px-3">Variant</th>
                      <th className="py-2.5 px-3">Regular Price</th>
                      <th className="py-2.5 px-3">Sale Price (Discount)</th>
                      <th className="py-2.5 px-3">Cost Price</th>
                      <th className="py-2.5 px-3">Net Vol / Size</th>
                      <th className="py-2.5 px-3 text-center">Availability</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {nonDefaultVariants.map((v) => {
                      const optVal = v.selectedOptions?.[0]?.value || v.optionsKey;
                      const swatchHex = v.selectedOptions?.[0]?.swatchHex;
                      const vReg = parseFloat(v.regularPrice || v.price) || 0;
                      const vSale = parseFloat(v.salePrice) || 0;
                      const vCost = parseFloat(v.costPrice) || 0;
                      const vDiscounted = vSale > 0 && vSale < vReg;

                      return (
                        <tr key={v.id || v.optionsKey} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                          {/* Variant Name & Swatch */}
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              {swatchHex && (
                                <span
                                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: swatchHex }}
                                  title={`Hex: ${swatchHex}`}
                                />
                              )}
                              <span>{optVal}</span>
                            </div>
                          </td>

                          {/* Regular Price */}
                          <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                            ৳{vReg.toLocaleString()}
                          </td>

                          {/* Sale Price */}
                          <td className="py-2.5 px-3">
                            {vDiscounted ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ৳{vSale.toLocaleString()}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  {Math.round(((vReg - vSale) / vReg) * 100)}% OFF
                                </span>
                              </div>
                            ) : (
                              <span
                                className="text-gray-400 dark:text-gray-500 text-[11px]"
                                title="No active promotional discount — sells at regular standard price"
                              >
                                — (No discount)
                              </span>
                            )}
                          </td>

                          {/* Cost Price */}
                          <td className="py-2.5 px-3 text-gray-500">
                            {vCost > 0 ? `৳${vCost.toLocaleString()}` : "—"}
                          </td>

                          {/* Size */}
                          <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                            {v.sizeValue ? `${v.sizeValue} ${v.sizeUnit || "ml"}` : "—"}
                          </td>

                          {/* Availability */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                v.isAvailable
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                              }`}
                            >
                              {v.isAvailable ? "In Stock" : "Out of Stock"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                v.isActive !== false
                                  ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              {v.isActive !== false ? "Active" : "Archived"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: Skincare & Cosmetic Specifications (4-Column Grid) */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Skincare & Cosmetic Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Country of Origin */}
              <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/40">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Country of Origin</span>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                  {p.countryOfOrigin || "Not specified"}
                </p>
              </div>

              {/* Skin Type */}
              <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/40">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Skin Type</span>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                  {p.skinType || "All Skin Types"}
                </p>
              </div>

              {/* Skin Concerns */}
              <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/40">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Skin Concerns</span>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                  {p.skinConcerns || "Not specified"}
                </p>
              </div>

              {/* Expiry / PAO */}
              <div className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/40">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Expiry / PAO</span>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1">
                  {p.expiryInfo || "12M PAO"}
                </p>
              </div>
            </div>

            {/* How to use */}
            {p.howToUse && (() => {
              const steps = parseHowToUseSteps(p.howToUse);
              return (
                <div className="p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/30 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    Application Ritual & Routine Steps
                  </span>
                  {steps.length > 0 ? (
                    <div className="space-y-2 pt-0.5">
                      {steps.map((st, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div className="space-y-0.5">
                            {st.title ? (
                              <strong className="text-gray-900 dark:text-white block font-semibold text-xs">
                                {st.title}
                              </strong>
                            ) : null}
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed text-xs">
                              {st.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {typeof p.howToUse === "string" ? p.howToUse : JSON.stringify(p.howToUse)}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Key Ingredients */}
            {p.ingredients && (
              <div className="p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-800/30 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <FaFlask className="h-3 w-3 text-[#9B4F5E]" /> Key Ingredients & Full Formulation
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {p.ingredients}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 5: Search & SEO Visibility */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <FaSearch className="h-3 w-3 text-gray-400" /> Search Engine Preview (Google SERP)
            </h3>

            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4 space-y-1 max-w-xl">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
                https://eloura.com › products › {p.slug}
              </p>
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 truncate hover:underline cursor-pointer">
                {p.seoTitle || p.name}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {p.seoDescription || p.shortDescription || p.description || "Browse authentic skincare and cosmetics on Elourá."}
              </p>
            </div>
          </div>

          {/* SECTION 6: Audit & System Metadata */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20 p-3.5 flex flex-wrap items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 gap-2 font-mono">
            <span>Created: {formattedCreated}</span>
            <span>Last Updated: {formattedUpdated}</span>
            <span>Product ID: {p.id}</span>
          </div>

        </div>

        {/* ── Modal Footer (Pinned) ── */}
        <div className="shrink-0 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 px-6 py-3.5">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            {isLoadingDetails && (
              <span className="inline-flex items-center gap-1.5 text-gray-400 text-[11px]">
                <FaSpinner className="h-3 w-3 animate-spin text-[#9B4F5E]" />
                Syncing full details...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <Link
              href={`/admin/products/${p.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors"
            >
              <FaEdit className="h-3 w-3" />
              Edit Product
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

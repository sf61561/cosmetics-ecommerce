"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FaShoppingCart,
  FaCheck,
  FaHeart,
  FaRegHeart,
  FaMinus,
  FaPlus,
  FaTruck,
  FaShieldAlt,
  FaUndo,
  FaMoneyBillWave,
  FaSpinner,
} from "react-icons/fa";
import { useProductRequest } from "@/context/ProductRequestContext";

export default function ProductInfo({
  product,
  quantity,
  setQuantity,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  isAddingToCart,
  isAddedToCart,
  onVariantSelected,
}) {
  const { openProductRequest } = useProductRequest();
  const hasVariants = Boolean(
    product.hasVariants &&
      product.options &&
      product.options.length > 0 &&
      product.variants &&
      product.variants.length > 0
  );

  // Track customer selected option values, e.g. { "Shade": "Rose", "Size": "4 ml" }
  const [selectedOptions, setSelectedOptions] = useState({});

  const allOptionsSelected = hasVariants
    ? product.options.every((opt) => Boolean(selectedOptions[opt.name]))
    : true;

  // Find concrete matching variant when all options are picked
  const matchedVariant = useMemo(() => {
    if (!hasVariants) {
      return product.variants?.[0] || null;
    }
    if (!allOptionsSelected) return null;

    return (
      product.variants.find((v) => {
        if (!v.isActive) return false;
        if (v.selectedOptions && v.selectedOptions.length > 0) {
          return product.options.every((opt) => {
            const expectedVal = selectedOptions[opt.name];
            return v.selectedOptions.some(
              (so) => (so.optionName === opt.name || so.name === opt.name) && so.value === expectedVal
            );
          });
        }
        const parts = (v.optionsKey || "").split("/").map((s) => s.trim());
        return product.options.every((opt) => parts.includes(selectedOptions[opt.name]));
      }) || null
    );
  }, [hasVariants, allOptionsSelected, product.variants, product.options, selectedOptions]);

  // Inform parent view when matched variant changes (e.g. for reactive image switching)
  useEffect(() => {
    if (onVariantSelected) {
      onVariantSelected(matchedVariant);
    }
  }, [matchedVariant, onVariantSelected]);

  const handleSelectOption = (optName, val) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optName]: val,
    }));
  };

  // Check if an option value combination exists and is available
  const isOptionValueAvailable = (optName, val) => {
    if (!hasVariants) return true;
    return product.variants.some((v) => {
      if (!v.isActive || !v.isAvailable) return false;
      const matchesThis =
        v.selectedOptions?.some((so) => (so.optionName === optName || so.name === optName) && so.value === val) ||
        (v.optionsKey && v.optionsKey.includes(val));
      if (!matchesThis) return false;

      for (const [otherOptName, otherVal] of Object.entries(selectedOptions)) {
        if (otherOptName === optName) continue;
        const matchesOther =
          v.selectedOptions?.some(
            (so) => (so.optionName === otherOptName || so.name === otherOptName) && so.value === otherVal
          ) || (v.optionsKey && v.optionsKey.includes(otherVal));
        if (!matchesOther) return false;
      }
      return true;
    });
  };

  // Stock status
  const isVariantOutOfStock = hasVariants
    ? Boolean(allOptionsSelected && (!matchedVariant || !matchedVariant.isAvailable))
    : false;
  const isProductOutOfStock = product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity <= 0;
  const isOutOfStock = hasVariants ? isVariantOutOfStock : isProductOutOfStock;
  const isLowStock =
    !hasVariants &&
    (product.stockStatus === "LOW_STOCK" ||
      (product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 5)));

  // Pricing calculations
  const minPrice =
    product.minVariantPrice !== null && product.minVariantPrice !== undefined
      ? Number(product.minVariantPrice)
      : Number(product.price) || 0;

  let displayPrice = 0;
  let regularPrice = 0;
  let hasDiscount = false;
  let discountAmount = 0;
  let discountPercent = null;

  if (hasVariants) {
    if (matchedVariant) {
      displayPrice = Number(matchedVariant.price);
      if (matchedVariant.compareAtPrice && Number(matchedVariant.compareAtPrice) > displayPrice) {
        hasDiscount = true;
        regularPrice = Number(matchedVariant.compareAtPrice);
        discountAmount = regularPrice - displayPrice;
        discountPercent = Math.round((discountAmount / regularPrice) * 100);
      }
    } else {
      displayPrice = minPrice;
    }
  } else {
    regularPrice = Number(product.price) || 0;
    const salePrice = product.salePrice ? Number(product.salePrice) : null;
    displayPrice = salePrice && salePrice < regularPrice ? salePrice : regularPrice;
    hasDiscount = Boolean(salePrice && salePrice < regularPrice);
    if (hasDiscount) {
      discountAmount = regularPrice - salePrice;
      discountPercent = Math.round((discountAmount / regularPrice) * 100);
    }
  }

  const maxQuantity = isOutOfStock ? 1 : Math.max(1, Math.min(product.stockQuantity || 1, 10));

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col justify-between space-y-6">
      {/* ── Brand, Title & Collections ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {product.brand?.name ? (
            <Link
              href={`/brands`}
              className="text-xs font-bold tracking-widest text-[#9B4F5E] dark:text-pink-400 uppercase hover:underline"
            >
              {product.brand.name}
            </Link>
          ) : (
            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              Eloura Authentic
            </span>
          )}

          {product.collections && product.collections.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {product.collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="text-[11px] font-medium text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/60 px-2.5 py-0.5 rounded-full transition-colors"
                >
                  {col.name}
                </Link>
              ))}
            </div>
          ) : product.category?.name ? (
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
              {product.category.name}
            </span>
          ) : null}
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-gray-900 dark:text-white font-normal tracking-tight leading-snug">
          {product.name}
        </h1>

        {product.sku && (
          <p className="text-[11px] font-mono text-gray-400">
            SKU: <span className="font-semibold text-gray-600 dark:text-gray-300">{product.sku}</span>
          </p>
        )}
      </div>

      {/* ── Pricing in BDT ── */}
      <div className="rounded-2xl bg-[#FAF7F5] dark:bg-gray-900/60 border border-pink-100/60 dark:border-gray-800 p-4 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {hasVariants && !matchedVariant ? (
              <span>From ৳{displayPrice.toLocaleString()}</span>
            ) : (
              <span>৳{displayPrice.toLocaleString()}</span>
            )}
          </span>

          {hasDiscount && (
            <>
              <span className="text-base sm:text-lg text-gray-400 line-through">
                ৳{regularPrice.toLocaleString()}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D64E74] text-white">
                SAVE ৳{discountAmount.toLocaleString()} ({discountPercent}% OFF)
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Inclusive of all applicable VAT & import taxes in Bangladesh.
        </p>
      </div>

      {/* ── Short Description ── */}
      {(product.shortDescription || product.description) && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {product.shortDescription || product.description}
        </p>
      )}

      {/* ── Options & Variants Builder (Shades, Sizes, Dropdowns) ── */}
      {hasVariants && (
        <div className="space-y-4 pt-1 pb-1 border-y border-gray-100 dark:border-gray-800">
          {product.options.map((opt) => {
            const currentSelected = selectedOptions[opt.name];
            return (
              <div key={opt.id || opt.name} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {opt.name}:{" "}
                    <span className="font-bold text-[#9B4F5E] dark:text-pink-300 normal-case">
                      {currentSelected || "Select..."}
                    </span>
                  </span>
                </div>

                {opt.type === "swatch" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {opt.values.map((val) => {
                      const isSelected = currentSelected === val.value;
                      const isAvail = isOptionValueAvailable(opt.name, val.value);
                      return (
                        <button
                          key={val.id || val.value}
                          type="button"
                          onClick={() => handleSelectOption(opt.name, val.value)}
                          title={`${val.value}${!isAvail ? " (Unavailable)" : ""}`}
                          className={`group relative h-9 w-9 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-offset-2 ring-[#9B4F5E] dark:ring-offset-gray-900 scale-105"
                              : "hover:scale-105 opacity-85 hover:opacity-100"
                          } ${!isAvail ? "opacity-35" : ""}`}
                        >
                          <span
                            className="h-8 w-8 rounded-full border border-black/15 shadow-2xs block"
                            style={{ backgroundColor: val.swatchHex || "#D9534F" }}
                          />
                          {isSelected && (
                            <FaCheck className="absolute h-3 w-3 text-white drop-shadow-md" />
                          )}
                          {!isAvail && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-full h-0.5 bg-red-500/80 rotate-45 transform" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : opt.type === "dropdown" ? (
                  <select
                    value={currentSelected || ""}
                    onChange={(e) => handleSelectOption(opt.name, e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-medium text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Select {opt.name}...</option>
                    {opt.values.map((val) => {
                      const isAvail = isOptionValueAvailable(opt.name, val.value);
                      return (
                        <option key={val.id || val.value} value={val.value}>
                          {val.value} {!isAvail ? "(Out of stock)" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  /* Button pills */
                  <div className="flex flex-wrap items-center gap-2">
                    {opt.values.map((val) => {
                      const isSelected = currentSelected === val.value;
                      const isAvail = isOptionValueAvailable(opt.name, val.value);
                      return (
                        <button
                          key={val.id || val.value}
                          type="button"
                          onClick={() => handleSelectOption(opt.name, val.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-[#9B4F5E] text-white border-[#9B4F5E] shadow-2xs"
                              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                          } ${!isAvail ? "opacity-40 line-through" : ""}`}
                        >
                          {val.swatchHex && (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-2xs shrink-0 inline-block"
                              style={{ backgroundColor: val.swatchHex }}
                            />
                          )}
                          <span>{val.value}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stock Availability Badge ── */}
      <div className="flex items-center gap-2 text-xs">
        {isOutOfStock ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Currently Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Low Stock — Only {product.stockQuantity} remaining in warehouse
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            In Stock — Ready for immediate dispatch
          </span>
        )}
      </div>

      {/* ── Volume / Size Variant Chip (when no custom variants) ── */}
      {!hasVariants && product.volume && (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 block">
            Standard Volume
          </span>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-[#9B4F5E] bg-[#FAF7F5] dark:bg-gray-800 text-xs font-bold text-[#9B4F5E] dark:text-pink-300 shadow-2xs">
            <span>{product.volume}</span>
            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Full Size)</span>
          </div>
        </div>
      )}

      {/* ── Purchase Actions: Quantity, Add to Bag & Wishlist ── */}
      <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 sm:w-36 shrink-0 shadow-2xs">
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleDecrement}
              disabled={quantity <= 1 || isOutOfStock}
              aria-label="Decrease quantity"
              className="p-1 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FaMinus className="h-3 w-3" />
            </button>
            <span className="font-semibold text-sm text-gray-900 dark:text-white select-none">
              {quantity}
            </span>
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleIncrement}
              disabled={quantity >= maxQuantity || isOutOfStock}
              aria-label="Increase quantity"
              className="p-1 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FaPlus className="h-3 w-3" />
            </button>
          </div>

          {/* Add to Bag Button */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onAddToCart(allOptionsSelected ? matchedVariant : null)}
            disabled={
              isOutOfStock ||
              isAddingToCart
            }
            className={`flex-1 py-3.5 px-6 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer ${
              isOutOfStock
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none"
                : isAddedToCart
                ? "bg-emerald-600 text-white"
                : "bg-[#9B4F5E] text-white hover:bg-[#843f4e] active:scale-[0.99]"
            }`}
          >
            {isAddingToCart ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                <span>Adding to Bag...</span>
              </>
            ) : isAddedToCart ? (
              <>
                <FaCheck className="h-4 w-4" />
                <span>Added to Bag!</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <FaShoppingCart className="h-4 w-4" />
                <span>
                  {hasVariants && !allOptionsSelected
                    ? `Add to Bag • From ৳${(displayPrice * quantity).toLocaleString()}`
                    : `Add to Bag • ৳${(displayPrice * quantity).toLocaleString()}`}
                </span>
              </>
            )}
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={onToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            title={isWishlisted ? "In Wishlist" : "Save to Wishlist"}
            className={`p-3.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs ${
              isWishlisted
                ? "border-red-300 bg-red-50 dark:bg-red-950/40 text-red-500"
                : "border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-200"
            }`}
          >
            {isWishlisted ? (
              <FaHeart className="h-4 w-4 text-red-500" />
            ) : (
              <FaRegHeart className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ── Need a specific variant or shade? ── */}
        <div className="flex items-center justify-between text-xs pt-1 px-1 text-gray-500 dark:text-gray-400">
          <span>Need an unlisted shade, size, or custom request?</span>
          <button
            type="button"
            onClick={() => openProductRequest({ productName: product.name })}
            className="text-[#9B4F5E] dark:text-pink-400 font-semibold hover:underline cursor-pointer"
          >
            Request this Product ✿
          </button>
        </div>
      </div>

      {/* ── Value Props & Trust Signals ── */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <FaShieldAlt className="text-[#9B4F5E] dark:text-pink-400 h-3.5 w-3.5 shrink-0" />
          <span>100% Authentic South Korean Origin</span>
        </div>
        <div className="flex items-center gap-2">
          <FaTruck className="text-[#9B4F5E] dark:text-pink-400 h-3.5 w-3.5 shrink-0" />
          <span>24–48h Express Delivery in Dhaka</span>
        </div>
        <div className="flex items-center gap-2">
          <FaMoneyBillWave className="text-[#9B4F5E] dark:text-pink-400 h-3.5 w-3.5 shrink-0" />
          <span>Cash on Delivery (COD) Available</span>
        </div>
        <div className="flex items-center gap-2">
          <FaUndo className="text-[#9B4F5E] dark:text-pink-400 h-3.5 w-3.5 shrink-0" />
          <span>Easy 7-Day Unopened Return</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaTrashAlt, FaMinus, FaPlus, FaHeart, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { interactionService } from "@/services/interactionService";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

export default function CartItem({ item, onUpdateQuantity, onUpdateVariant, onRemove, onNotify }) {
  const [imgSrc, setImgSrc] = useState(item.thumbnailUrl || FALLBACK_IMAGE);
  const [isUpdatingQty, setIsUpdatingQty] = useState(false);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);
  const [showChangeVariant, setShowChangeVariant] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);

  useEffect(() => {
    if (item.thumbnailUrl) {
      setImgSrc(item.thumbnailUrl);
    }
  }, [item.thumbnailUrl]);

  const handleVariantChange = async (targetVariantId) => {
    if (!targetVariantId || targetVariantId === item.variantId || isUpdatingVariant) return;
    if (typeof onUpdateVariant !== "function") return;

    setIsUpdatingVariant(true);
    try {
      const res = await onUpdateVariant(item.id, targetVariantId);
      if (res?.success) {
        if (onNotify) onNotify("Shade / Size updated in your bag.");
      } else if (res?.message) {
        if (onNotify) onNotify(res.message);
      }
    } finally {
      setIsUpdatingVariant(false);
      setShowChangeVariant(false);
    }
  };

  const handleQuantityChange = async (delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1 || newQty === item.quantity || isUpdatingQty) return;

    if (newQty > item.stockQuantity) {
      if (onNotify) onNotify(`Only ${item.stockQuantity} units available in stock.`);
      return;
    }

    setIsUpdatingQty(true);
    try {
      const res = await onUpdateQuantity(item.id, newQty);
      if (!res?.success && res?.message) {
        if (onNotify) onNotify(res.message);
      }
    } finally {
      setIsUpdatingQty(false);
    }
  };

  const handleRemove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      const res = await onRemove(item.id);
      if (res?.success) {
        if (onNotify) onNotify(`Removed "${item.name}" from your bag.`);
      } else if (res?.message) {
        if (onNotify) onNotify(res.message);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSaveToWishlist = async () => {
    if (isWishlisting) return;
    setIsWishlisting(true);
    try {
      await interactionService.recordInteraction({
        productId: item.productId,
        type: "WISHLIST",
      });
      if (onNotify) onNotify(`Saved "${item.name}" to your wishlist.`);
    } catch {
      if (onNotify) onNotify("Could not save to wishlist. Please try again.");
    } finally {
      setIsWishlisting(false);
    }
  };

  const isBlocked = item.isOutOfStock || !item.isAvailable;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
        item.requiresVariantSelection
          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs"
          : isBlocked
          ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
          : item.exceedsStock
          ? "bg-amber-50/30 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40"
          : "bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 shadow-xs hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Product Thumbnail */}
        <Link
          href={`/product/${item.slug}`}
          className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 block group"
        >
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            sizes="112px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
          />
          {item.hasDiscount && !isBlocked && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#9B4F5E] text-white text-[10px] font-bold shadow-xs">
              SALE
            </span>
          )}
        </Link>

        {/* Details & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {/* Brand & Volume Header */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9B4F5E] dark:text-rose-300">
                {item.brand?.name || "Eloura Beauty"}
              </span>
              {item.volume && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-mono">
                  {item.volume}
                </span>
              )}
            </div>

            {/* Product Title */}
            <Link
              href={`/product/${item.slug}`}
              className="font-serif text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-[#9B4F5E] dark:hover:text-rose-300 transition-colors line-clamp-2 leading-snug mb-1"
            >
              {item.name}
            </Link>

            {/* Required Variant Selector Alert Banner & Dropdown */}
            {item.requiresVariantSelection && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-semibold mb-2">
                  <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 shrink-0 text-xs" />
                  <span>Please choose your shade or size before checkout</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id={`variant-select-${item.id}`}
                    value=""
                    onChange={(e) => handleVariantChange(e.target.value)}
                    disabled={isUpdatingVariant}
                    className="flex-1 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E] cursor-pointer"
                  >
                    <option value="" disabled>
                      {isUpdatingVariant ? "Updating option..." : "— Choose Shade / Size —"}
                    </option>
                    {item.availableVariants?.map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                        {v.name} • ৳{Number(v.price).toLocaleString()} {!v.isAvailable ? "(Out of stock)" : ""}
                      </option>
                    ))}
                  </select>
                  {isUpdatingVariant && (
                    <FaSpinner className="animate-spin text-xs text-[#9B4F5E]" />
                  )}
                </div>
              </div>
            )}

            {/* Variant Combination Badge (with Change option) */}
            {item.variantName && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/40 px-2 py-0.5 rounded-md">
                  {item.variantName}
                </span>

                {item.availableVariants && item.availableVariants.length > 1 && (
                  <div className="relative inline-block">
                    {showChangeVariant ? (
                      <select
                        value={item.variantId || ""}
                        onChange={(e) => handleVariantChange(e.target.value)}
                        disabled={isUpdatingVariant}
                        className="text-[11px] font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-2 focus:outline-hidden focus:ring-1 focus:ring-[#9B4F5E] cursor-pointer"
                      >
                        {item.availableVariants.map((v) => (
                          <option key={v.id} value={v.id} disabled={!v.isAvailable}>
                            {v.name} • ৳{Number(v.price).toLocaleString()} {!v.isAvailable ? "(Out of stock)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowChangeVariant(true)}
                        className="text-[11px] text-gray-500 hover:text-[#9B4F5E] dark:text-gray-400 dark:hover:text-pink-300 underline font-medium cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stock Warnings */}
            {item.isOutOfStock ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium bg-red-100/60 dark:bg-red-950/50 px-2.5 py-1 rounded-lg mb-2">
                <FaExclamationTriangle className="text-[11px] shrink-0" />
                <span>Out of stock. Please remove this item to proceed to checkout.</span>
              </div>
            ) : item.exceedsStock ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-100/60 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg mb-2">
                <FaExclamationTriangle className="text-[11px] shrink-0" />
                <span>Only {item.stockQuantity} available. Please reduce quantity.</span>
              </div>
            ) : item.stockQuantity <= 5 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2">
                Hurry! Only {item.stockQuantity} left in stock.
              </p>
            ) : null}

            {/* Unit Price Display */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ৳{item.unitPrice?.toLocaleString()}
              </span>
              {item.hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  ৳{item.regularPrice?.toLocaleString()}
                </span>
              )}
              {item.hasDiscount && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Save ৳{(item.regularPrice - item.unitPrice)?.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Bar: Quantity Controls, Line Total, Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* Quantity Controller */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleQuantityChange(-1)}
                disabled={item.quantity <= 1 || isUpdatingQty || isBlocked}
                aria-label="Decrease quantity"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FaMinus className="text-[10px]" />
              </button>

              <span className="w-8 text-center text-xs font-semibold text-gray-900 dark:text-white">
                {isUpdatingQty ? (
                  <FaSpinner className="inline-block animate-spin text-[10px] text-gray-500" />
                ) : (
                  item.quantity
                )}
              </span>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleQuantityChange(1)}
                disabled={item.quantity >= item.stockQuantity || isUpdatingQty || isBlocked}
                aria-label="Increase quantity"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FaPlus className="text-[10px]" />
              </button>
            </div>

            {/* Line Total & Action Buttons */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Total</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ৳{item.lineTotal?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-800 pl-3">
                {/* Save for later / Wishlist */}
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleSaveToWishlist}
                  disabled={isWishlisting}
                  title="Save for Later"
                  aria-label="Save to Wishlist"
                  className="p-2 rounded-full text-gray-400 hover:text-[#9B4F5E] dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <FaHeart className="text-xs" />
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleRemove}
                  disabled={isRemoving}
                  title="Remove from Bag"
                  aria-label="Remove item"
                  className="p-2 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  {isRemoving ? (
                    <FaSpinner className="animate-spin text-xs" />
                  ) : (
                    <FaTrashAlt className="text-xs" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


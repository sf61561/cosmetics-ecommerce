"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaTrashAlt,
  FaMinus,
  FaPlus,
  FaHeart,
  FaExclamationTriangle,
  FaSpinner,
  FaCheck,
} from "react-icons/fa";
import { interactionService } from "@/services/interactionService";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

export default function CartItem({
  item = {},
  onUpdateQuantity,
  onUpdateVariant,
  onRemove,
  onNotify,
}) {
  const [imgSrc, setImgSrc] = useState(item?.thumbnailUrl || FALLBACK_IMAGE);
  const [prevThumbnail, setPrevThumbnail] = useState(item?.thumbnailUrl);
  const [isUpdatingQty, setIsUpdatingQty] = useState(false);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);

  // Synchronize image src without cascading effect renders
  if (item?.thumbnailUrl !== prevThumbnail) {
    setPrevThumbnail(item?.thumbnailUrl);
    setImgSrc(item?.thumbnailUrl || FALLBACK_IMAGE);
  }

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
    }
  };

  const handleQuantityChange = async (delta) => {
    const currentQty = Number(item?.quantity || 1);
    const newQty = currentQty + delta;
    if (newQty < 1 || newQty === currentQty || isUpdatingQty) return;

    const availableStock = Number(item?.stockQuantity ?? 9999);
    if (newQty > availableStock) {
      if (onNotify) onNotify(`Only ${availableStock} units available in stock.`);
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
        if (onNotify) onNotify(`Removed "${item.name || "Product"}" from your bag.`);
      } else if (res?.message) {
        if (onNotify) onNotify(res.message);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSaveToWishlist = async () => {
    if (isWishlisting || !item?.productId) return;
    setIsWishlisting(true);
    try {
      await interactionService.recordInteraction({
        productId: item.productId,
        type: "WISHLIST",
      });
      if (onNotify) onNotify(`Saved "${item.name || "Product"}" to your wishlist.`);
    } catch {
      if (onNotify) onNotify("Could not save to wishlist. Please try again.");
    } finally {
      setIsWishlisting(false);
    }
  };

  const isBlocked = Boolean(item?.isOutOfStock || !item?.isAvailable);
  const variantsList = Array.isArray(item?.availableVariants) ? item.availableVariants : [];
  const unitPrice = Number(item?.unitPrice || 0);
  const regularPrice = Number(item?.regularPrice || unitPrice);
  const lineTotal = Number(item?.lineTotal || unitPrice * Number(item?.quantity || 1));

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
        item?.requiresVariantSelection
          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs"
          : isBlocked
          ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
          : item?.exceedsStock
          ? "bg-amber-50/30 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40"
          : "bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 shadow-xs hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Product Thumbnail */}
        <Link
          href={`/products/${item?.slug || item?.productId || ""}`}
          className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 block group"
        >
          <Image
            src={imgSrc}
            alt={item?.name || "Product Image"}
            fill
            sizes="112px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
          />
          {item?.hasDiscount && !isBlocked && (
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
                {item?.brand?.name || "Eloura Beauty"}
              </span>
              {item?.volume && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-mono">
                  {item.volume}
                </span>
              )}
            </div>

            {/* Product Title */}
            <Link
              href={`/products/${item?.slug || item?.productId || ""}`}
              className="font-serif text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-[#9B4F5E] dark:hover:text-rose-300 transition-colors line-clamp-2 leading-snug mb-2"
            >
              {item?.name || "Product"}
            </Link>

            {/* ── Case 1: Unselected Variant Attention Banner with Toggle Pills ── */}
            {item?.requiresVariantSelection && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-200 font-semibold">
                    <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 shrink-0 text-xs" />
                    <span>Please choose your shade or size:</span>
                  </div>
                  {isUpdatingVariant && (
                    <span className="flex items-center gap-1 text-[11px] text-[#9B4F5E] dark:text-pink-300 font-medium">
                      <FaSpinner className="animate-spin text-[10px]" />
                      <span>Saving...</span>
                    </span>
                  )}
                </div>

                {/* Toggle Pill Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {variantsList.map((v) => {
                    const isSelected = item?.variantId === v.id;
                    const isAvail = v.isAvailable !== false;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVariantChange(v.id)}
                        disabled={!isAvail || isUpdatingVariant}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#9B4F5E] text-white border-[#9B4F5E] shadow-2xs cursor-default"
                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-[#9B4F5E] hover:text-[#9B4F5E]"
                        } ${!isAvail ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                      >
                        {v.swatchHex && (
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-2xs shrink-0 inline-block"
                            style={{ backgroundColor: v.swatchHex }}
                          />
                        )}
                        <span>{v.name || "Option"}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          • ৳{Number(v.price || 0).toLocaleString()}
                        </span>
                        {isSelected && <FaCheck className="text-[9px] ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Case 2: Selected Variant with Interactive Toggle Pills (PDP Style) ── */}
            {!item?.requiresVariantSelection && (
              <div className="mb-2.5 space-y-1.5">
                {variantsList.length > 1 ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span>Option:</span>
                        <span className="font-bold text-[#9B4F5E] dark:text-pink-300">
                          {item?.variantName || "Selected"}
                        </span>
                      </span>
                      {isUpdatingVariant && (
                        <span className="flex items-center gap-1 text-[11px] text-[#9B4F5E] dark:text-pink-300 font-medium">
                          <FaSpinner className="animate-spin text-[10px]" />
                          <span>Updating...</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {variantsList.map((v) => {
                        const isSelected = item?.variantId === v.id;
                        const isAvail = v.isAvailable !== false;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVariantChange(v.id)}
                            disabled={!isAvail || isUpdatingVariant || isSelected}
                            className={`px-2.5 py-1 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-[#9B4F5E] text-white border-[#9B4F5E] shadow-2xs cursor-default font-semibold"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-[#9B4F5E] hover:text-[#9B4F5E] cursor-pointer font-medium"
                            } ${!isAvail ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                          >
                            {v.swatchHex && (
                              <span
                                className="h-3 w-3 rounded-full border border-black/15 shadow-2xs shrink-0 inline-block"
                                style={{ backgroundColor: v.swatchHex }}
                              />
                            )}
                            <span>{v.name || "Option"}</span>
                            {isSelected && <FaCheck className="text-[9px] ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : item?.variantName ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/40 px-2.5 py-0.5 rounded-lg">
                      {item.variantName}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Stock Warnings */}
            {item?.isOutOfStock ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium bg-red-100/60 dark:bg-red-950/50 px-2.5 py-1 rounded-lg mb-2">
                <FaExclamationTriangle className="text-[11px] shrink-0" />
                <span>Out of stock. Please remove this item to proceed to checkout.</span>
              </div>
            ) : item?.exceedsStock ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-100/60 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg mb-2">
                <FaExclamationTriangle className="text-[11px] shrink-0" />
                <span>Only {item?.stockQuantity || 0} available. Please reduce quantity.</span>
              </div>
            ) : Number(item?.stockQuantity || 99) <= 5 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2">
                Hurry! Only {item?.stockQuantity} left in stock.
              </p>
            ) : null}

            {/* Unit Price Display */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ৳{unitPrice.toLocaleString()}
              </span>
              {item?.hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  ৳{regularPrice.toLocaleString()}
                </span>
              )}
              {item?.hasDiscount && regularPrice > unitPrice && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Save ৳{(regularPrice - unitPrice).toLocaleString()}
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
                disabled={Number(item?.quantity || 1) <= 1 || isUpdatingQty || isBlocked}
                aria-label="Decrease quantity"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FaMinus className="text-[10px]" />
              </button>

              <span className="w-8 text-center text-xs font-semibold text-gray-900 dark:text-white">
                {isUpdatingQty ? (
                  <FaSpinner className="inline-block animate-spin text-[10px] text-gray-500" />
                ) : (
                  item?.quantity || 1
                )}
              </span>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => handleQuantityChange(1)}
                disabled={
                  Number(item?.quantity || 1) >= Number(item?.stockQuantity || 9999) ||
                  isUpdatingQty ||
                  isBlocked
                }
                aria-label="Increase quantity"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FaPlus className="text-[10px]" />
              </button>
            </div>

            {/* Line Total & Action Buttons */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Total</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ৳{lineTotal.toLocaleString()}
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
                  className="p-2 rounded-full text-gray-400 hover:text-[#9B4F5E] dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
                  className="p-2 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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

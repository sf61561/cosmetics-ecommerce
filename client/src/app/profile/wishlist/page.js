"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaHeart, FaTrashAlt, FaShoppingBag, FaArrowRight, FaCheck } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { wishlistService } from "@/services/wishlistService";
import { useWishlist } from "@/context/WishlistContext";

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function WishlistPage() {
  const { toggleWishlist, moveToCart, clearWishlist: clearCtxWishlist, wishlistCount } = useWishlist();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [movingIds, setMovingIds] = useState(new Set());
  const [movedIds, setMovedIds] = useState(new Set());
  const [isClearing, setIsClearing] = useState(false);

  const loadWishlist = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await wishlistService.getWishlist({ page, limit: 12 });
      if (res?.success && res.data) {
        setItems(res.data.items || []);
        setPagination(
          res.data.pagination || { totalItems: res.data.items?.length || 0, totalPages: 1, currentPage: page }
        );
      } else {
        setItems([]);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load your wishlist.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist(1);
  }, [loadWishlist, wishlistCount]);

  const handleRemove = async (productId) => {
    // Optimistic removal from view
    setItems((prev) => prev.filter((item) => (item.productId || item.id) !== productId));
    await toggleWishlist(productId);
  };

  const handleMoveToBag = async (item) => {
    const pId = item.productId || item.id;
    if (movingIds.has(pId)) return;

    setMovingIds((prev) => new Set(prev).add(pId));
    try {
      const res = await moveToCart(pId, 1);
      if (res.success) {
        setMovedIds((prev) => new Set(prev).add(pId));
        setTimeout(() => {
          setItems((prev) => prev.filter((it) => (it.productId || it.id) !== pId));
          setMovedIds((prev) => {
            const next = new Set(prev);
            next.delete(pId);
            return next;
          });
        }, 1200);
      } else {
        setError(res.message || "Could not move product to bag.");
      }
    } catch (err) {
      setError(err.message || "Failed to move product to bag.");
    } finally {
      setMovingIds((prev) => {
        const next = new Set(prev);
        next.delete(pId);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all items from your wishlist?")) return;
    setIsClearing(true);
    try {
      await clearCtxWishlist();
      setItems([]);
      setPagination({ totalItems: 0, totalPages: 1, currentPage: 1 });
    } catch (err) {
      setError(err.message || "Failed to clear wishlist.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ProfileLayout
      title="My Wishlist"
      description="Keep your favorite beauty products close at hand and move them to your bag when ready."
    >
      {/* Header action bar */}
      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{items.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{pagination.totalItems || items.length}</span> saved{" "}
            {(pagination.totalItems || items.length) === 1 ? "item" : "items"}
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isClearing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FaTrashAlt className="h-3 w-3" />
            {isClearing ? "Clearing..." : "Clear all"}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadWishlist(pagination.currentPage)}
            className="font-semibold underline cursor-pointer hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-gray-100 bg-white p-4 shadow-xs animate-pulse space-y-4"
            >
              <div className="h-56 w-full rounded-2xl bg-gray-100" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const pId = item.productId || item.id;
              const isMoving = movingIds.has(pId);
              const isMoved = movedIds.has(pId);
              const outOfStock = item.isOutOfStock || !item.inStock;

              return (
                <div
                  key={item.id || pId}
                  className="group relative flex flex-col justify-between rounded-3xl border border-pink-100/70 bg-white p-4 shadow-xs transition-all duration-300 hover:shadow-md hover:border-pink-200"
                >
                  {/* Top section: image with remove button & stock badge */}
                  <div className="relative overflow-hidden rounded-2xl bg-[#FBF0F0]">
                    <Link href={`/products/${item.slug}`} className="block">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-56 w-full items-center justify-center bg-[#F7E5ED] text-gray-400">
                          No Image
                        </div>
                      )}
                    </Link>

                    {/* Stock status badge */}
                    <div className="absolute bottom-3 left-3">
                      {outOfStock ? (
                        <span className="inline-flex items-center rounded-full bg-red-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-red-700 backdrop-blur-xs">
                          Out of stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 backdrop-blur-xs">
                          In stock
                        </span>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(pId)}
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-xs backdrop-blur-xs transition hover:scale-110 active:scale-95 hover:bg-white hover:text-red-600 cursor-pointer"
                    >
                      <FaHeart className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Product details */}
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                      {item.brandName || "Eloura"}
                    </p>
                    <Link
                      href={`/products/${item.slug}`}
                      className="mt-1 font-medium text-gray-900 transition hover:text-[#9B4F5E] line-clamp-2"
                    >
                      {item.name}
                    </Link>

                    {/* Price */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base font-bold text-[#9B4F5E]">
                        {money(item.currentPrice || item.salePrice || item.price)}
                      </span>
                      {item.salePrice && item.salePrice < item.price && (
                        <span className="text-xs text-gray-400 line-through">
                          {money(item.price)}
                        </span>
                      )}
                    </div>

                    {/* Move to bag button */}
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <button
                        type="button"
                        onClick={() => handleMoveToBag(item)}
                        disabled={outOfStock || isMoving || isMoved}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                          outOfStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                            : isMoved
                            ? "bg-emerald-600 text-white"
                            : "bg-[#9B4F5E] text-white hover:bg-[#843F4E] active:scale-[0.98]"
                        } disabled:opacity-60`}
                      >
                        {isMoved ? (
                          <>
                            <FaCheck className="h-3.5 w-3.5" />
                            Moved to Bag!
                          </>
                        ) : isMoving ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Moving...
                          </>
                        ) : outOfStock ? (
                          "Out of Stock"
                        ) : (
                          <>
                            <FaShoppingBag className="h-3.5 w-3.5" />
                            Move to Bag
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => loadWishlist(p)}
                  className={`h-9 w-9 rounded-full text-xs font-semibold transition ${
                    pagination.currentPage === p
                      ? "bg-[#9B4F5E] text-white"
                      : "bg-white text-gray-700 hover:bg-pink-50 border border-gray-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-3xl border border-pink-100 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF0F0] text-[#9B4F5E]">
            <FaHeart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-medium text-gray-900">Your wishlist is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Explore authentic Korean and Japanese skincare formulas and save your favorites to review anytime.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#843F4E] active:scale-95"
          >
            Explore products
            <FaArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </ProfileLayout>
  );
}

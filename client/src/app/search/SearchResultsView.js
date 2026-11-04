"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useTransition, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaSearch,
  FaFilter,
  FaTimes,
  FaShoppingBag,
  FaCheck,
  FaChevronDown,
  FaArrowRight,
  FaExclamationCircle,
} from "react-icons/fa";
import { searchService } from "@/services/searchService";
import { useCart } from "@/context/CartContext";
import WishlistButton from "@/components/product/WishlistButton";

const POPULAR_TAGS = [
  "Sunscreen",
  "Serum",
  "Cleanser",
  "Toner",
  "Moisturizer",
  "Centella",
  "Snail Mucin",
  "Niacinamide",
];

const money = (val) =>
  `৳${Number(val || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function SearchResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [isPending, startTransition] = useTransition();

  // URL state
  const q = searchParams.get("q") || "";
  const collectionParam = searchParams.get("collection") || searchParams.get("category") || "";
  const categoryParam = collectionParam;
  const brandParam = searchParams.get("brand") || "";
  const minParam = searchParams.get("min") || "";
  const maxParam = searchParams.get("max") || "";
  const sortParam = searchParams.get("sort") || "relevance";
  const inStockParam = searchParams.get("inStock") === "true";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  // Component state
  const [data, setData] = useState({
    query: q,
    total: 0,
    page: 1,
    pageSize: 16,
    totalPages: 1,
    items: [],
    facets: { collections: [], categories: [], brands: [], priceRange: { min: 0, max: 0 } },
    didYouMean: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minParam);
  const [localMax, setLocalMax] = useState(maxParam);
  const [addedIds, setAddedIds] = useState(new Set());

  // Keep local price inputs in sync with URL
  useEffect(() => {
    setLocalMin(minParam);
    setLocalMax(maxParam);
  }, [minParam, maxParam]);

  // Fetch search data whenever searchParams change
  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await searchService.search(
          {
            q,
            collection: collectionParam,
            category: collectionParam,
            brand: brandParam,
            min: minParam,
            max: maxParam,
            sort: sortParam,
            inStock: inStockParam,
            page: pageParam,
            limit: 16,
          },
          { signal: controller.signal }
        );

        if (isSubscribed) {
          setData(result);
        }
      } catch (err) {
        if (err.name !== "AbortError" && isSubscribed) {
          setError(err.message || "Failed to load search results.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [q, categoryParam, brandParam, minParam, maxParam, sortParam, inStockParam, pageParam]);

  // Helper to push updated search parameters to the URL
  const updateQuery = useCallback(
    (updates = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === "" || val === false) {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });

      // Reset page to 1 when changing filters
      if (!("page" in updates)) {
        next.delete("page");
      }

      startTransition(() => {
        router.push(`/search?${next.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleApplyPrice = (e) => {
    e.preventDefault();
    updateQuery({ min: localMin || null, max: localMax || null });
  };

  const handleClearAllFilters = () => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    setLocalMin("");
    setLocalMax("");
    startTransition(() => {
      router.push(`/search?${next.toString()}`);
    });
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await addToCart(product.id, 1);
      if (res.success) {
        setAddedIds((prev) => new Set(prev).add(product.id));
        setTimeout(() => {
          setAddedIds((prev) => {
            const copy = new Set(prev);
            copy.delete(product.id);
            return copy;
          });
        }, 2000);
      }
    } catch {
      // Non-blocking
    }
  };

  const hasActiveFilters = Boolean(
    categoryParam || brandParam || minParam || maxParam || inStockParam
  );

  const activeFilterCount =
    (categoryParam ? 1 : 0) +
    (brandParam ? 1 : 0) +
    (minParam || maxParam ? 1 : 0) +
    (inStockParam ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* ── Header: Title, Search Query, and Controls ── */}
      <div className="mb-6 border-b border-pink-100 pb-6">
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-gray-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[#9B4F5E]">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/shop" className="hover:text-[#9B4F5E]">
                Shop
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">Search</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-gray-900">
              {q ? (
                <>
                  Results for <span className="text-[#9B4F5E]">“{q}”</span>
                </>
              ) : (
                "Search All Products"
              )}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {isLoading ? (
                "Searching authentic formulations..."
              ) : (
                <>
                  Showing <span className="font-semibold text-gray-900">{data.items.length}</span> of{" "}
                  <span className="font-semibold text-gray-900">{data.total}</span>{" "}
                  {data.total === 1 ? "product" : "products"}
                </>
              )}
            </p>
          </div>

          {/* Controls: Mobile filter toggle & Sort selector */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 lg:hidden cursor-pointer"
            >
              <FaFilter className="h-3 w-3 text-[#9B4F5E]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#9B4F5E] text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort selector */}
            <div className="relative">
              <select
                aria-label="Sort products"
                value={sortParam}
                onChange={(e) => updateQuery({ sort: e.target.value })}
                className="h-9 rounded-full border border-gray-200 bg-white pl-4 pr-9 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#9B4F5E] focus:ring-1 focus:ring-[#9B4F5E] cursor-pointer shadow-2xs"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="best_selling">Best Selling</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active filter tags row */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-medium text-gray-400">Active filters:</span>

            {collectionParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-[#9B4F5E]">
                Collection: {collectionParam}
                <button
                  type="button"
                  onClick={() => updateQuery({ collection: null, category: null })}
                  className="hover:text-red-600 cursor-pointer"
                  aria-label="Remove collection filter"
                >
                  <FaTimes className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {brandParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-[#9B4F5E]">
                Brand: {brandParam}
                <button
                  type="button"
                  onClick={() => updateQuery({ brand: null })}
                  className="hover:text-red-600 cursor-pointer"
                  aria-label="Remove brand filter"
                >
                  <FaTimes className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {(minParam || maxParam) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-[#9B4F5E]">
                Price: ৳{minParam || "0"} - ৳{maxParam || "Any"}
                <button
                  type="button"
                  onClick={() => updateQuery({ min: null, max: null })}
                  className="hover:text-red-600 cursor-pointer"
                  aria-label="Remove price filter"
                >
                  <FaTimes className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {inStockParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                In Stock Only
                <button
                  type="button"
                  onClick={() => updateQuery({ inStock: null })}
                  className="hover:text-red-600 cursor-pointer"
                  aria-label="Remove in-stock filter"
                >
                  <FaTimes className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 transition underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Main Layout: Filters Sidebar + Results Grid ── */}
      <div className="flex gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden w-64 shrink-0 lg:block space-y-6">
          {/* Collections filter */}
          <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">
              Collections
            </h2>
            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => updateQuery({ collection: null, category: null })}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  !collectionParam
                    ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>All Collections</span>
              </button>
              {(data.facets.collections || data.facets.categories || []).map((c) => (
                <button
                  key={c.id || c.slug}
                  type="button"
                  onClick={() => updateQuery({ collection: c.slug, category: null })}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    collectionParam === c.slug
                      ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate text-left">{c.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Brands filter */}
          <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">
              Brands
            </h2>
            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => updateQuery({ brand: null })}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  !brandParam
                    ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>All Brands</span>
              </button>
              {data.facets.brands.map((b) => (
                <button
                  key={b.id || b.slug}
                  type="button"
                  onClick={() => updateQuery({ brand: b.slug })}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    brandParam === b.slug
                      ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate text-left">{b.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                    {b.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range filter */}
          <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">
              Price Range (BDT)
            </h2>
            <form onSubmit={handleApplyPrice} className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#9B4F5E] focus:bg-white"
                />
                <span className="text-xs text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#9B4F5E] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#9B4F5E] py-1.5 text-xs font-semibold text-white hover:bg-[#843F4E] transition cursor-pointer"
              >
                Apply Range
              </button>
            </form>
          </div>

          {/* In Stock toggle */}
          <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-2xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                In Stock Only
              </span>
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateQuery({ inStock: e.target.checked || null })}
                className="h-4 w-4 rounded accent-[#9B4F5E] cursor-pointer"
              />
            </label>
          </div>
        </aside>

        {/* Right Content: Grid or Empty State */}
        <section className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => updateQuery({})}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-gray-100 bg-white p-4 shadow-xs animate-pulse space-y-3"
                >
                  <div className="aspect-square w-full rounded-2xl bg-gray-100" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded" />
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                  <div className="h-9 w-full bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : data.items.length > 0 ? (
            /* Product Results Grid */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.items.map((product) => {
                  const isAdded = addedIds.has(product.id);
                  const isOutOfStock = product.stockStatus === "out_of_stock" || !product.inStock;

                  return (
                    <article
                      key={product.id}
                      className="group relative flex flex-col justify-between rounded-3xl border border-pink-100/70 bg-white p-4 shadow-2xs transition-all duration-300 hover:border-pink-200 hover:shadow-lg"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#FBF0F0]">
                        <Link href={`/products/${product.slug}`} className="block h-full w-full">
                          {product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#F7E5ED] text-xs text-gray-400">
                              Beauty
                            </div>
                          )}
                        </Link>

                        {/* Floating Wishlist Button */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <WishlistButton productId={product.id} size="sm" />
                        </div>

                        {/* Stock status pill */}
                        <div className="absolute bottom-2.5 left-2.5">
                          {isOutOfStock ? (
                            <span className="rounded-full bg-red-100/90 px-2 py-0.5 text-[10px] font-semibold text-red-700 backdrop-blur-xs">
                              Out of stock
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 backdrop-blur-xs">
                              In stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="mt-3 flex flex-1 flex-col justify-between">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {product.brandName}
                          </span>
                          <Link
                            href={`/products/${product.slug}`}
                            className="mt-1 block font-medium text-xs sm:text-sm text-gray-900 transition hover:text-[#9B4F5E] line-clamp-2"
                          >
                            {product.name}
                          </Link>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm sm:text-base font-bold text-[#9B4F5E]">
                              {money(product.currentPrice)}
                            </span>
                            {product.salePrice && product.salePrice < product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {money(product.price)}
                              </span>
                            )}
                          </div>

                          {/* Add to Bag Button */}
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={isOutOfStock}
                            className={`mt-3 w-full py-2 px-3 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                              isOutOfStock
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                : isAdded
                                ? "bg-emerald-600 text-white"
                                : "bg-[#9B4F5E] text-white hover:bg-[#843F4E] active:scale-[0.98]"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <FaCheck className="h-3 w-3" />
                                Added!
                              </>
                            ) : isOutOfStock ? (
                              "Out of Stock"
                            ) : (
                              <>
                                <FaShoppingBag className="h-3 w-3" />
                                Add to Bag
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Numbered Pagination */}
              {data.totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={data.page <= 1}
                    onClick={() => updateQuery({ page: data.page - 1 })}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>

                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateQuery({ page: p })}
                      className={`h-9 w-9 rounded-full text-xs font-semibold transition cursor-pointer ${
                        data.page === p
                          ? "bg-[#9B4F5E] text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-pink-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={data.page >= data.totalPages}
                    onClick={() => updateQuery({ page: data.page + 1 })}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── Helpful Empty Results State (Never a blank page!) ── */
            <div className="rounded-3xl border border-pink-100 bg-white p-8 sm:p-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF0F0] text-[#9B4F5E]">
                <FaSearch className="h-7 w-7" />
              </div>

              <h2 className="mt-4 font-serif text-2xl font-medium text-gray-900">
                {q ? `No results for “${q}”` : "No products found"}
              </h2>

              {/* Did you mean suggestion */}
              {data.didYouMean && (
                <div className="mt-3 text-sm text-gray-600">
                  Did you mean:{" "}
                  <button
                    type="button"
                    onClick={() => updateQuery({ q: data.didYouMean })}
                    className="font-bold text-[#9B4F5E] underline hover:text-[#843F4E] cursor-pointer"
                  >
                    “{data.didYouMean}”
                  </button>
                  ?
                </div>
              )}

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                We couldn’t find any authentic items matching your exact search. Try checking your
                spelling, using more general terms, or adjusting your filter selections.
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#843F4E]"
                >
                  Explore All Products
                  <FaArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Popular categories tags */}
              <div className="mt-10 border-t border-gray-100 pt-8">
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Popular Searches & Routine Essentials
                </span>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => updateQuery({ q: tag, category: null, brand: null })}
                      className="rounded-full border border-pink-100 bg-[#FBF0F0] px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-pink-300 hover:bg-pink-100 hover:text-[#9B4F5E] cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Mobile Filters Drawer (Modal Slide-over) ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs lg:hidden">
          <div className="flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <FaFilter className="h-3.5 w-3.5 text-[#9B4F5E]" />
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close filters"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Collections */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">
                  Collections
                </span>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateQuery({ collection: null, category: null });
                      setMobileFiltersOpen(false);
                    }}
                    className={`block w-full text-left px-2 py-1.5 text-xs rounded-lg ${
                      !collectionParam ? "bg-pink-50 text-[#9B4F5E] font-bold" : "text-gray-600"
                    }`}
                  >
                    All Collections
                  </button>
                  {(data.facets.collections || data.facets.categories || []).map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        updateQuery({ collection: c.slug, category: null });
                        setMobileFiltersOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-xs rounded-lg ${
                        collectionParam === c.slug
                          ? "bg-pink-50 text-[#9B4F5E] font-bold"
                          : "text-gray-600"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-gray-400">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">
                  Brands
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      updateQuery({ brand: null });
                      setMobileFiltersOpen(false);
                    }}
                    className={`block w-full text-left px-2 py-1.5 text-xs rounded-lg ${
                      !brandParam ? "bg-pink-50 text-[#9B4F5E] font-bold" : "text-gray-600"
                    }`}
                  >
                    All Brands
                  </button>
                  {data.facets.brands.map((b) => (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => {
                        updateQuery({ brand: b.slug });
                        setMobileFiltersOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-xs rounded-lg ${
                        brandParam === b.slug
                          ? "bg-pink-50 text-[#9B4F5E] font-bold"
                          : "text-gray-600"
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-[10px] text-gray-400">{b.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock toggle */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center justify-between text-xs font-bold text-gray-900">
                  <span>In Stock Only</span>
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => {
                      updateQuery({ inStock: e.target.checked || null });
                      setMobileFiltersOpen(false);
                    }}
                    className="h-4 w-4 accent-[#9B4F5E]"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="w-full rounded-full border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


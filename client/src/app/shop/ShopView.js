"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FaFilter,
  FaTimes,
  FaShoppingBag,
  FaCheck,
  FaChevronDown,
  FaExclamationCircle,
} from "react-icons/fa";
import { searchService } from "@/services/searchService";
import { useCart } from "@/context/CartContext";
import WishlistButton from "@/components/product/WishlistButton";
import ProductRatingBadge from "@/components/common/ProductRatingBadge";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

const SORT_OPTIONS = [
  { value: "relevance", label: "Featured" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const money = (val) =>
  `৳${Number(val || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function ShopView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [isPending, startTransition] = useTransition();

  // Read URL params
  const collectionParam = searchParams.get("collection") || "";
  const brandParam = searchParams.get("brand") || "";
  const minParam = searchParams.get("min") || "";
  const maxParam = searchParams.get("max") || "";
  const sortParam = searchParams.get("sort") || "relevance";
  const inStockParam = searchParams.get("inStock") === "true";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  // Component state
  const [data, setData] = useState({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    items: [],
    facets: { collections: [], categories: [], brands: [], priceRange: { min: 0, max: 0 } },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minParam);
  const [localMax, setLocalMax] = useState(maxParam);
  const [addedIds, setAddedIds] = useState(new Set());

  // Sync price inputs with URL
  useEffect(() => {
    setLocalMin(minParam);
    setLocalMax(maxParam);
  }, [minParam, maxParam]);

  // URL query builder
  const updateQuery = useCallback(
    (newParams) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });

      // Reset to page 1 if changing any filter other than page
      if (!Object.prototype.hasOwnProperty.call(newParams, "page")) {
        current.delete("page");
      }

      const queryString = current.toString();
      startTransition(() => {
        router.push(`/shop${queryString ? `?${queryString}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  // Fetch products whenever search params change
  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    async function fetchShopProducts() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await searchService.search(
          {
            q: "",
            collection: collectionParam,
            brand: brandParam,
            min: minParam,
            max: maxParam,
            sort: sortParam,
            inStock: inStockParam,
            page: pageParam,
            limit: 12,
          },
          { signal: controller.signal }
        );

        if (isSubscribed) {
          setData(result);
        }
      } catch (err) {
        if (err.name !== "AbortError" && isSubscribed) {
          setError(err.message || "Failed to load products. Please try again.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchShopProducts();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [collectionParam, brandParam, minParam, maxParam, sortParam, inStockParam, pageParam]);

  const handleApplyPrice = (e) => {
    e.preventDefault();
    updateQuery({
      min: localMin.trim() ? localMin.trim() : null,
      max: localMax.trim() ? localMax.trim() : null,
    });
  };

  const handleClearAllFilters = () => {
    setLocalMin("");
    setLocalMax("");
    startTransition(() => {
      router.push("/shop");
    });
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await addToCart(product.id);
    if (result.success) {
      setAddedIds((prev) => new Set(prev).add(product.id));
      window.setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }, 2000);
    }
  };

  // Active filter count for badge
  const activeFilterCount =
    (collectionParam ? 1 : 0) +
    (brandParam ? 1 : 0) +
    (minParam || maxParam ? 1 : 0) +
    (inStockParam ? 1 : 0);

  const collectionsList = data.facets?.collections?.length
    ? data.facets.collections
    : data.facets?.categories || [];
  const brandsList = data.facets?.brands || [];

  return (
    <div className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#9B4F5E]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Shop All</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#9B4F5E] dark:text-pink-400 block mb-1">
            THE ELOURA EDIT
          </span>
          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Shop All Products
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            Discover authentic Korean, Japanese, and international skincare and cosmetics curated for tropical climates.
          </p>
        </div>

        {/* Control Toolbar: Results Count, Sort, Mobile Filter Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 mb-6 border-b border-gray-200/80 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {isLoading ? (
                "Loading products..."
              ) : (
                <>
                  Showing <span className="font-bold text-gray-900 dark:text-white">{data.total}</span> product{data.total === 1 ? "" : "s"}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer shadow-2xs"
            >
              <FaFilter className="text-xs text-[#9B4F5E]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-[#9B4F5E] px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <label htmlFor="shop-sort" className="text-xs text-gray-500 dark:text-gray-400 mr-2 hidden sm:inline">
                Sort by:
              </label>
              <div className="relative">
                <select
                  id="shop-sort"
                  value={sortParam}
                  onChange={(e) => updateQuery({ sort: e.target.value })}
                  className="appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-3 pr-8 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar (when filters applied) */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-gray-400 mr-1">Active filters:</span>

            {collectionParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3 py-1 text-xs text-[#9B4F5E] dark:text-rose-300 font-medium">
                <span>Collection: {collectionsList.find((c) => c.slug === collectionParam)?.name || collectionParam}</span>
                <button
                  type="button"
                  onClick={() => updateQuery({ collection: null })}
                  className="hover:text-red-600 cursor-pointer"
                  title="Remove collection filter"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </span>
            )}

            {brandParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3 py-1 text-xs text-[#9B4F5E] dark:text-rose-300 font-medium">
                <span>Brand: {brandsList.find((b) => b.slug === brandParam)?.name || brandParam}</span>
                <button
                  type="button"
                  onClick={() => updateQuery({ brand: null })}
                  className="hover:text-red-600 cursor-pointer"
                  title="Remove brand filter"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </span>
            )}

            {(minParam || maxParam) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3 py-1 text-xs text-[#9B4F5E] dark:text-rose-300 font-medium">
                <span>
                  Price: {minParam ? `৳${minParam}` : "৳0"} - {maxParam ? `৳${maxParam}` : "Any"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalMin("");
                    setLocalMax("");
                    updateQuery({ min: null, max: null });
                  }}
                  className="hover:text-red-600 cursor-pointer"
                  title="Remove price filter"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </span>
            )}

            {inStockParam && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 px-3 py-1 text-xs text-[#9B4F5E] dark:text-rose-300 font-medium">
                <span>In Stock Only</span>
                <button
                  type="button"
                  onClick={() => updateQuery({ inStock: null })}
                  className="hover:text-red-600 cursor-pointer"
                  title="Remove stock filter"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-[#9B4F5E] hover:underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Main Layout: Sidebar Filters + Products Grid ── */}
        <div className="flex gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-5 sticky top-24">
            {/* Collections Facet */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2.5">
                Collections
              </h2>
              <div className="mt-3 space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => updateQuery({ collection: null })}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    !collectionParam
                      ? "bg-[#FBF0F0] dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-400 font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>All Collections</span>
                </button>
                {collectionsList.map((c) => (
                  <button
                    key={c.id || c.slug}
                    type="button"
                    onClick={() => updateQuery({ collection: collectionParam === c.slug ? null : c.slug })}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      collectionParam === c.slug
                        ? "bg-[#FBF0F0] dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-400 font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
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

            {/* Brands Facet */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2.5">
                Brands
              </h2>
              <div className="mt-3 space-y-1 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => updateQuery({ brand: null })}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    !brandParam
                      ? "bg-[#FBF0F0] dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-400 font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>All Brands</span>
                </button>
                {brandsList.map((b) => (
                  <button
                    key={b.id || b.slug}
                    type="button"
                    onClick={() => updateQuery({ brand: brandParam === b.slug ? null : b.slug })}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      brandParam === b.slug
                        ? "bg-[#FBF0F0] dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-400 font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
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

            {/* Price Range Filter */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2.5">
                Price (BDT)
              </h2>
              <form onSubmit={handleApplyPrice} className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">৳</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={localMin}
                      onChange={(e) => setLocalMin(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-6 pr-2 py-1.5 text-xs text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-[#9B4F5E]"
                    />
                  </div>
                  <span className="text-xs text-gray-400">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">৳</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={localMax}
                      onChange={(e) => setLocalMax(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-6 pr-2 py-1.5 text-xs text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-[#9B4F5E]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#9B4F5E] py-1.5 text-xs font-semibold text-white hover:bg-[#843F4E] transition cursor-pointer"
                >
                  Apply Range
                </button>
              </form>
            </div>

            {/* Availability Filter */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
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

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </aside>

          {/* Right Product Grid Area */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => updateQuery({})}
                  className="font-semibold underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoading ? (
              /* Loading Skeleton Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse space-y-4 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xs"
                  >
                    <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : data.items.length === 0 ? (
              /* Empty Results State */
              <div className="rounded-3xl border border-pink-100/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center shadow-2xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F5] dark:bg-gray-800 text-[#9B4F5E] dark:text-rose-300 mb-4">
                  <FaShoppingBag className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-white">
                  No products match your criteria
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Try adjusting your collection, brand, or price filters to find what you&apos;re looking for.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#843F4E] transition shadow-xs cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              /* Products Grid */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.items.map((product) => {
                    const isAdded = addedIds.has(product.id);
                    const price = product.currentPrice ?? product.price;
                    const brandName = product.brandName || product.brand?.name || "ELOURA";
                    const isOutOfStock = !product.inStock || product.stockStatus === "out_of_stock";

                    return (
                      <article
                        key={product.id}
                        className="group flex flex-col justify-between rounded-3xl border border-pink-100/70 bg-white p-5 shadow-2xs transition-all duration-300 hover:border-pink-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div>
                          {/* Image Thumbnail Container */}
                          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#FAF7F5] dark:bg-gray-800">
                            <Link href={`/products/${product.slug}`} className="block h-full w-full">
                              <Image
                                src={product.thumbnailUrl || FALLBACK_IMAGE}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </Link>

                            {/* Wishlist Button */}
                            <div className="absolute top-3 right-3 z-10">
                              <WishlistButton productId={product.id} size="sm" />
                            </div>

                            {/* Stock Badge */}
                            <div className="absolute bottom-3 left-3 z-10">
                              {isOutOfStock ? (
                                <span className="rounded-full bg-red-100/90 dark:bg-red-950/80 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300 backdrop-blur-xs">
                                  Out of stock
                                </span>
                              ) : product.hasDiscount ? (
                                <span className="rounded-full bg-pink-100/90 dark:bg-pink-950/80 px-2 py-0.5 text-[10px] font-semibold text-[#9B4F5E] dark:text-pink-300 backdrop-blur-xs">
                                  Sale
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Brand & Product Title */}
                          <div className="mt-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B4F5E] dark:text-pink-400">
                              {brandName}
                            </p>
                            <Link
                              href={`/products/${product.slug}`}
                              className="mt-1 block font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-[#9B4F5E] transition-colors line-clamp-2"
                              title={product.name}
                            >
                              {product.name}
                            </Link>

                            {/* Review Stars & Count */}
                            <div className="mt-1.5">
                              <ProductRatingBadge
                                rating={product.averageRating || product.average_rating}
                                reviewCount={product.reviewCount || product.review_count}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Price & Add to Bag */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                          <div>
                            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                              {money(price)}
                            </span>
                            {product.hasDiscount && product.price && (
                              <span className="ml-2 text-xs text-gray-400 line-through">
                                {money(product.price)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(event) => handleAddToCart(event, product)}
                            disabled={isAdded || isOutOfStock}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 shadow-2xs ${
                              isAdded
                                ? "bg-emerald-600"
                                : isOutOfStock
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-500"
                                : "bg-[#9B4F5E] hover:bg-[#843F4E]"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <FaCheck className="h-2.5 w-2.5" />
                                <span>Added</span>
                              </>
                            ) : isOutOfStock ? (
                              <span>Sold out</span>
                            ) : (
                              <>
                                <FaShoppingBag className="h-2.5 w-2.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* ── Numbered Pagination ── */}
                {data.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={data.page <= 1}
                      onClick={() => {
                        updateQuery({ page: data.page - 1 });
                        window.scrollTo({ top: 120, behavior: "smooth" });
                      }}
                      className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition shadow-2xs"
                    >
                      Previous
                    </button>

                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          updateQuery({ page: p });
                          window.scrollTo({ top: 120, behavior: "smooth" });
                        }}
                        className={`h-9 w-9 rounded-full text-xs font-semibold transition cursor-pointer ${
                          data.page === p
                            ? "bg-[#9B4F5E] text-white shadow-xs"
                            : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={data.page >= data.totalPages}
                      onClick={() => {
                        updateQuery({ page: data.page + 1 });
                        window.scrollTo({ top: 120, behavior: "smooth" });
                      }}
                      className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition shadow-2xs"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileFiltersOpen(false);
          }}
        >
          <div className="w-full max-w-xs bg-white dark:bg-gray-900 h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <FaFilter className="text-xs text-[#9B4F5E]" />
                  <h3 className="font-serif text-base font-bold text-gray-900 dark:text-white">
                    Filter Products
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Collections */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-2">
                  Collections
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateQuery({ collection: null });
                      setMobileFiltersOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                      !collectionParam ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold" : "text-gray-600"
                    }`}
                  >
                    <span>All Collections</span>
                  </button>
                  {collectionsList.map((c) => (
                    <button
                      key={c.id || c.slug}
                      type="button"
                      onClick={() => {
                        updateQuery({ collection: collectionParam === c.slug ? null : c.slug });
                        setMobileFiltersOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                        collectionParam === c.slug ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold" : "text-gray-600"
                      }`}
                    >
                      <span className="truncate text-left">{c.name}</span>
                      <span className="text-[10px] text-gray-400">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Brands */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-2">
                  Brands
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateQuery({ brand: null });
                      setMobileFiltersOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                      !brandParam ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold" : "text-gray-600"
                    }`}
                  >
                    <span>All Brands</span>
                  </button>
                  {brandsList.map((b) => (
                    <button
                      key={b.id || b.slug}
                      type="button"
                      onClick={() => {
                        updateQuery({ brand: brandParam === b.slug ? null : b.slug });
                        setMobileFiltersOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                        brandParam === b.slug ? "bg-[#FBF0F0] text-[#9B4F5E] font-bold" : "text-gray-600"
                      }`}
                    >
                      <span className="truncate text-left">{b.name}</span>
                      <span className="text-[10px] text-gray-400">{b.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-2">
                  Price (BDT)
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={localMin}
                    onChange={(e) => setLocalMin(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localMax}
                    onChange={(e) => setLocalMax(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Mobile In Stock */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">In Stock Only</span>
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => updateQuery({ inStock: e.target.checked || null })}
                    className="h-4 w-4 rounded accent-[#9B4F5E]"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyPrice(new Event("submit"));
                  setMobileFiltersOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-[#9B4F5E] text-white text-xs font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


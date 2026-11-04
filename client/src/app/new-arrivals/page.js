"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaShoppingBag, FaCheck, FaExclamationCircle } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { productService } from "@/services/productService";
import { interactionService } from "@/services/interactionService";
import WishlistButton from "@/components/product/WishlistButton";

export default function NewArrivalsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const fetchArrivals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productService.getNewArrivals(24);
      if (res?.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load new arrivals:", err);
      setError(err.message || "Failed to load new arrivals. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      try {
        const res = await productService.getNewArrivals(24);
        if (isSubscribed) {
          if (res?.success && Array.isArray(res.data)) {
            setProducts(res.data);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Failed to load new arrivals:", err);
          setError(err.message || "Failed to load new arrivals. Please try again.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    setAddedIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);

    // Track interaction
    await interactionService.recordInteraction({
      productId: product.id,
      type: "ADD_TO_CART",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FCFBF9] dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* ── Breadcrumb ── */}
          <nav className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-x-2">
            <Link href="/" className="hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">New Arrivals</span>
          </nav>

          {/* ── Header ── */}
          <div className="mt-6 text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[#9B4F5E] dark:text-pink-400 uppercase">
              FRESH FORMULATIONS
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white tracking-tight">
              New Arrivals
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
              Explore our freshest Korean & Japanese skincare formulations, curated in real time to elevate your daily glow.
            </p>
            {!isLoading && !error && products.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                Showing {products.length} recently published product{products.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {/* ── Error State ── */}
          {error && (
            <div className="mt-12 max-w-md mx-auto p-6 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-center space-y-3">
              <FaExclamationCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchArrivals}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Loading Skeleton ── */}
          {isLoading && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse space-y-4"
                >
                  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 w-full" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty State ── */}
          {!isLoading && !error && products.length === 0 && (
            <div className="mt-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-300 flex items-center justify-center mx-auto text-xl">
                ✨
              </div>
              <h3 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100">
                No New Arrivals Yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                We are actively curating new Korean and Japanese beauty products. Check back very soon!
              </p>
              <Link
                href="/shop"
                className="inline-block px-6 py-2.5 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
              >
                Browse All Products
              </Link>
            </div>
          )}

          {/* ── Product Grid ── */}
          {!isLoading && !error && products.length > 0 && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const isAdded = addedIds.has(product.id);
                const brandLabel =
                  product.brand?.name ||
                  (typeof product.brand === "string" ? product.brand : "K-BEAUTY");

                const productHref = `/products/${product.slug || product.id}`;
                const imageSrc =
                  product.thumbnailUrl ||
                  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col justify-between rounded-3xl p-5 bg-white dark:bg-gray-900 border border-pink-100/70 dark:border-gray-800 shadow-2xs hover:shadow-xl hover:border-pink-200 dark:hover:border-gray-700 transition-all duration-300"
                  >
                    {/* Top: Image & Link */}
                    <Link href={productHref} className="block">
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FAF7F5] dark:bg-gray-800">
                        <Image
                          src={imageSrc}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* New Badge */}
                        <div className="absolute top-3 left-3 bg-[#9B4F5E] text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-xs">
                          NEW
                        </div>
                        {/* Wishlist Button */}
                        <div className="absolute top-3 right-3 z-10">
                          <WishlistButton productId={product.id} size="sm" />
                        </div>
                      </div>

                      {/* Brand name */}
                      <span className="block text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mt-4">
                        {brandLabel}
                      </span>

                      {/* Product Title */}
                      <h2 className="font-serif text-sm sm:text-base font-normal text-gray-900 dark:text-gray-100 line-clamp-1 mt-1 group-hover:text-[#9B4F5E] dark:group-hover:text-pink-300 transition-colors">
                        {product.name}
                      </h2>

                      {/* Price */}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          ৳{(product.salePrice || product.price).toLocaleString()}
                        </span>
                        {product.salePrice && product.salePrice < product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            ৳{product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Bottom: Add to Cart Action */}
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, product)}
                      className={`mt-5 w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-[#F3E8E8] dark:bg-gray-800 text-gray-800 dark:text-pink-200 hover:bg-[#EED9DC] dark:hover:bg-gray-700"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <FaCheck className="h-3 w-3" />
                          <span>Added to Cart</span>
                        </>
                      ) : (
                        <>
                          <span>Add to Cart</span>
                          <FaShoppingBag className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

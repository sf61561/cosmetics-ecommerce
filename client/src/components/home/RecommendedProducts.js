"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaShoppingBag, FaCheck } from "react-icons/fa";
import { recommendationService } from "@/services/recommendationService";
import { interactionService } from "@/services/interactionService";
import { useCart } from "@/context/CartContext";
import WishlistButton from "@/components/product/WishlistButton";
import ProductRatingBadge from "@/components/common/ProductRatingBadge";

export default function RecommendedProducts() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    let isSubscribed = true;

    async function loadRecommendations() {
      try {
        const res = await recommendationService.getPersonalizedRecommendations(8);
        if (isSubscribed && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data.slice(0, 4));
        }
      } catch (err) {
        console.warn("Using recommendation fallback:", err.message);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.hasVariants) {
      router.push(`/products/${product.slug || product.id}`);
      return;
    }

    // Visual feedback
    setAddedIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);

    // Call persistent cart service if not a fallback ID
    if (!product.id.startsWith("fb-")) {
      try {
        await addToCart(product.id, 1);
      } catch {
        // Fallback to tracking
      }
    } else {
      // Track ADD_TO_CART interaction in backend recommendation engine
      await interactionService.recordInteraction({
        productId: product.id,
        type: "ADD_TO_CART",
      });
    }
  };

  return (
    <section className="w-full bg-white dark:bg-gray-950 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="block text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#9B4F5E] dark:text-pink-400 uppercase">
            CURATED FOR YOU
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white tracking-tight">
            Our Picks for You
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto pt-1">
            Discover handpicked Korean skincare favorites tailored to your skin&apos;s needs.
          </p>
        </div>

        {/* ── 4-Product Responsive Grid ── */}
        <div className="mt-12 sm:mt-16">
          {isLoading && products.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
                        {/* Wishlist Heart Button */}
                        <div className="absolute top-3 right-3 z-10">
                          <WishlistButton productId={product.id} size="sm" />
                        </div>
                      </div>

                      {/* Brand name */}
                      <span className="block text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mt-4">
                        {brandLabel}
                      </span>

                      {/* Product Title */}
                      <h3 className="font-serif text-sm sm:text-base font-normal text-gray-900 dark:text-gray-100 line-clamp-1 mt-1 group-hover:text-[#9B4F5E] dark:group-hover:text-pink-300 transition-colors">
                        {product.name}
                      </h3>

                      {/* Review Rating */}
                      <div className="mt-1">
                        <ProductRatingBadge
                          rating={product.averageRating || product.average_rating}
                          reviewCount={product.reviewCount || product.review_count}
                        />
                      </div>

                      {/* Price */}
                      <div className="mt-2 flex items-baseline gap-2">
                        {product.hasVariants ? (
                          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            From ৳{(product.minVariantPrice || product.price).toLocaleString()}
                          </span>
                        ) : (
                          <>
                            <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                              ৳{(product.salePrice || product.price).toLocaleString()}
                            </span>
                            {product.salePrice && product.salePrice < product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                ৳{product.price.toLocaleString()}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </Link>

                    {/* Bottom: Add to Cart Action */}
                    <button
                      type="button"
                      suppressHydrationWarning
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
                      ) : product.hasVariants ? (
                        <>
                          <span>Select Options</span>
                          <FaArrowRight className="h-3 w-3" />
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

        {/* ── View All Products CTA ── */}
        <div className="mt-12 sm:mt-14 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2.5 rounded-full border border-[#9B4F5E]/20 bg-[#FBF0F0] px-8 py-3.5 text-xs font-semibold tracking-wide text-[#9B4F5E] shadow-2xs transition-all duration-300 hover:bg-[#9B4F5E] hover:text-white hover:shadow-md dark:border-pink-300/20 dark:bg-gray-800 dark:text-pink-300 dark:hover:bg-[#9B4F5E] dark:hover:text-white sm:text-sm"
          >
            <span>View All Products</span>
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

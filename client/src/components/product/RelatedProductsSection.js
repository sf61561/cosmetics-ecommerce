"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaShoppingCart, FaCheck, FaArrowRight } from "react-icons/fa";
import { useCart } from "@/context/CartContext";
import ProductRatingBadge from "@/components/common/ProductRatingBadge";

export default function RelatedProductsSection({ relatedProducts = [] }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState(new Set());

  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  const handleQuickAdd = async (e, relProd) => {
    e.preventDefault();
    e.stopPropagation();

    if (relProd.hasVariants) {
      router.push(`/products/${relProd.slug || relProd.id}`);
      return;
    }

    setAddedIds((prev) => new Set(prev).add(relProd.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(relProd.id);
        return next;
      });
    }, 2500);

    try {
      await addToCart(relProd.id, 1);
    } catch {
      // Fallback
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-100 dark:border-gray-800">
      {/* ── Section Title ── */}
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
        <span className="text-xs font-bold tracking-widest text-[#9B4F5E] dark:text-pink-400 uppercase">
          COMPLETE YOUR RITUAL
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-gray-900 dark:text-white font-normal">
          Pairs Well With
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Curated formulations designed to complement and enhance your current skincare step.
        </p>
      </div>

      {/* ── Product Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((rel) => {
          const isAdded = addedIds.has(rel.id);
          const hasDiscount = rel.salePrice && rel.salePrice < rel.price;
          const currentPrice = hasDiscount ? rel.salePrice : rel.price;
          const isOutOfStock = rel.stockQuantity <= 0;

          return (
            <div
              key={rel.id}
              className="group flex flex-col justify-between rounded-3xl p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs hover:shadow-lg transition-all duration-300"
            >
              <Link href={`/products/${rel.slug || rel.id}`} className="block">
                {/* Thumbnail Frame */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FAF7F5] dark:bg-gray-800 mb-3.5">
                  <Image
                    src={
                      rel.thumbnailUrl ||
                      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={rel.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {hasDiscount && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D64E74] text-white">
                      SALE
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900/80 text-white backdrop-blur-xs">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Brand & Category */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    {rel.brand?.name || "K-BEAUTY"}
                  </span>
                  <h3 className="font-serif text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#9B4F5E] dark:group-hover:text-pink-300 transition-colors">
                    {rel.name}
                  </h3>

                  {/* Review Rating */}
                  <div className="pt-0.5">
                    <ProductRatingBadge
                      rating={rel.averageRating || rel.average_rating}
                      reviewCount={rel.reviewCount || rel.review_count}
                    />
                  </div>
                </div>

                {/* Pricing in BDT */}
                <div className="flex items-baseline gap-2 pt-2">
                  {rel.hasVariants ? (
                    <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      From ৳{(rel.minVariantPrice || rel.price).toLocaleString()}
                    </span>
                  ) : (
                    <>
                      <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                        ৳{currentPrice.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          ৳{rel.price.toLocaleString()}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Link>

              {/* Quick Add Button */}
              <button
                type="button"
                suppressHydrationWarning
                onClick={(e) => handleQuickAdd(e, rel)}
                disabled={!rel.hasVariants && isOutOfStock}
                className={`mt-4 w-full py-2.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  !rel.hasVariants && isOutOfStock
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none"
                    : isAdded
                    ? "bg-emerald-600 text-white"
                    : "bg-[#F3E8E8] dark:bg-gray-800 text-gray-800 dark:text-pink-200 hover:bg-[#EED9DC] dark:hover:bg-gray-700"
                }`}
              >
                {isAdded ? (
                  <>
                    <FaCheck className="h-3 w-3" />
                    <span>Added</span>
                  </>
                ) : rel.hasVariants ? (
                  <>
                    <span>Select Options</span>
                    <FaArrowRight className="h-3 w-3" />
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <FaShoppingCart className="h-3 w-3" />
                    <span>Quick Add</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}


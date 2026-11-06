"use client";

import Image from "next/image";
import { FaShoppingCart, FaCheck, FaSpinner } from "react-icons/fa";

export default function StickyMobilePurchaseBar({
  product,
  quantity = 1,
  selectedVariant = null,
  onAddToCart,
  isAddingToCart,
  isAddedToCart,
}) {
  const isSelectionRequired = Boolean(product.hasVariants && !selectedVariant);
  const isVariantOutOfStock = Boolean(selectedVariant && !selectedVariant.isAvailable);
  const isProductOutOfStock = product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity <= 0;
  const isOutOfStock = product.hasVariants ? isVariantOutOfStock : isProductOutOfStock;

  const regularPrice = Number(product.price) || 0;
  const salePrice = product.salePrice ? Number(product.salePrice) : null;
  const basePrice = salePrice && salePrice < regularPrice ? salePrice : regularPrice;
  const currentPrice = selectedVariant ? Number(selectedVariant.price) : basePrice;

  const thumbnail =
    selectedVariant?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    product.thumbnailUrl ||
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

  const handleBarClick = () => {
    onAddToCart(selectedVariant);
  };

  return (
    <div
      aria-label="Mobile quick purchase bar"
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        {/* Product Thumbnail & Price */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Image
              src={thumbnail}
              alt={product.name}
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-serif text-xs font-medium text-gray-900 dark:text-white truncate">
              {product.name}
            </h4>
            <span className="text-sm font-bold text-gray-900 dark:text-white block">
              ৳{(currentPrice * quantity).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Add to Bag Button */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleBarClick}
          disabled={isOutOfStock || isAddingToCart}
          className={`py-2.5 px-5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
            isOutOfStock
              ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none"
              : isAddedToCart
              ? "bg-emerald-600 text-white"
              : "bg-[#9B4F5E] text-white hover:bg-[#843f4e]"
          }`}
        >
          {isAddingToCart ? (
            <>
              <FaSpinner className="h-3 w-3 animate-spin" />
              <span>Adding...</span>
            </>
          ) : isAddedToCart ? (
            <>
              <FaCheck className="h-3 w-3" />
              <span>Added!</span>
            </>
          ) : isOutOfStock ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <FaShoppingCart className="h-3 w-3" />
              <span>Add to Bag</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


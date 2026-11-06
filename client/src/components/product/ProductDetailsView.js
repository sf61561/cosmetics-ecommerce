"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductGallery from "./ProductGallery";
import ProductInfo from "./ProductInfo";
import ProductTabs from "./ProductTabs";
import RelatedProductsSection from "./RelatedProductsSection";
import StickyMobilePurchaseBar from "./StickyMobilePurchaseBar";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { interactionService } from "@/services/interactionService";
import { recommendationService } from "@/services/recommendationService";

export default function ProductDetailsView({ initialProduct }) {
  const { addToCart } = useCart();
  const { isWishlisted: checkWishlisted, toggleWishlist } = useWishlist();
  const [product] = useState(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const isWishlisted = checkWishlisted(product?.id);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Prevent duplicate VIEW events during hot-reloads or re-renders
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!product?.id) return;
    let isSubscribed = true;

    // 1. Record meaningful VIEW interaction (once per product mount)
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      interactionService.recordInteraction({
        productId: product.id,
        type: "VIEW",
      });
    }

    // 2. Fetch Related Products
    recommendationService
      .getRelatedProducts(product.id, 4)
      .then((res) => {
        if (isSubscribed && res?.success && Array.isArray(res.data)) {
          setRelatedProducts(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [product?.id]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAddToCart = async (variantOverride = null) => {
    if (!product || isAddingToCart) return;

    const variantToUse = (variantOverride && variantOverride.id) ? variantOverride : selectedVariant;

    setIsAddingToCart(true);

    try {
      const res = await addToCart(product.id, quantity, variantToUse?.id || null);
      if (res?.success) {
        setIsAddedToCart(true);
        if (product.hasVariants && !variantToUse) {
          showToast(`Added to your bag! You can choose your shade/size in the bag before checkout.`);
        } else {
          const vLabel = variantToUse?.variantName || variantToUse?.optionsKey;
          const itemLabel = vLabel && vLabel !== "default" ? `"${product.name} (${vLabel})"` : `"${product.name}"`;
          showToast(`Added ${quantity} × ${itemLabel} to your shopping bag.`);
        }
        setTimeout(() => {
          setIsAddedToCart(false);
        }, 2500);
      } else {
        showToast(res?.message || "Unable to add item to bag.");
      }
    } catch (err) {
      showToast(err.message || "Unable to add item to bag. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product?.id) return;
    const res = await toggleWishlist(product.id);
    if (res?.message) {
      showToast(res.message);
    }
  };

  const isOutOfStock = product.stockStatus === "OUT_OF_STOCK" || product.stockQuantity <= 0;
  const isLowStock =
    product.stockStatus === "LOW_STOCK" ||
    (product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 5));

  const regularPrice = Number(product.price) || 0;
  const salePrice = product.salePrice ? Number(product.salePrice) : null;
  const hasDiscount = salePrice && salePrice < regularPrice;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Navbar />

      <main className="flex-1 pb-20 sm:pb-0">
        {/* ── Breadcrumb Navigation ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2"
          >
            <Link
              href="/"
              className="hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors"
            >
              Home
            </Link>
            <span aria-hidden="true">›</span>
            {product.collections && product.collections.length > 0 ? (
              <>
                <Link
                  href={`/collections/${product.collections[0].slug}`}
                  className="hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors"
                >
                  {product.collections[0].name}
                </Link>
                <span aria-hidden="true">›</span>
              </>
            ) : (
              <>
                <Link
                  href="/collections"
                  className="hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors"
                >
                  Collections
                </Link>
                <span aria-hidden="true">›</span>
              </>
            )}
            <span
              className="text-gray-900 dark:text-white font-medium line-clamp-1 max-w-xs sm:max-w-md"
              aria-current="page"
            >
              {product.name}
            </span>
          </nav>
        </div>

        {/* ── Main Product Section (Two-Column Layout) ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* Left: Gallery Column */}
            <ProductGallery
              images={product.images}
              thumbnailUrl={product.thumbnailUrl}
              selectedImageUrl={selectedVariant?.imageUrl || null}
              productName={product.name}
              discountPercentage={discountPercent}
              isOutOfStock={isOutOfStock}
              isLowStock={isLowStock}
              stockQuantity={product.stockQuantity}
            />

            {/* Right: Info & Purchase Controls Column */}
            <ProductInfo
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={isWishlisted}
              isAddingToCart={isAddingToCart}
              isAddedToCart={isAddedToCart}
              onVariantSelected={setSelectedVariant}
            />
          </div>
        </section>

        {/* ── Structured Product Content Tabs (Overview, Ingredients, Ritual, Specs, Delivery, Reviews) ── */}
        <ProductTabs product={product} />

        {/* ── Related Products / Complete Your Ritual ── */}
        <RelatedProductsSection relatedProducts={relatedProducts} />
      </main>

      {/* ── Mobile Sticky Purchase Bar ── */}
      <StickyMobilePurchaseBar
        product={product}
        quantity={quantity}
        selectedVariant={selectedVariant}
        onAddToCart={handleAddToCart}
        isAddingToCart={isAddingToCart}
        isAddedToCart={isAddedToCart}
      />

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-6 z-50 rounded-2xl bg-gray-900 text-white px-5 py-3 text-xs sm:text-sm font-medium shadow-2xl border border-gray-800 animate-slide-up flex items-center gap-2"
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </aside>
      )}

      <Footer />
    </div>
  );
}


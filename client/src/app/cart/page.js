"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import CartItemList from "@/components/cart/CartItemList";
import CartSummary from "@/components/cart/CartSummary";
import EmptyCartView from "@/components/cart/EmptyCartView";
import { FaChevronRight, FaArrowLeft, FaLock, FaSpinner } from "react-icons/fa";

export default function CartPage() {
  const {
    cart = {},
    isLoading,
    isUpdating,
    updateQuantity,
    updateVariant,
    removeFromCart,
    clearCart,
  } = useCart();

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium backdrop-blur-md border border-white/10 dark:border-black/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
        >
          {toastMessage}
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Breadcrumbs & Return Link */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center justify-between gap-4 mb-6 text-xs text-gray-500 dark:text-gray-400"
        >
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[#9B4F5E] dark:hover:text-rose-300 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <FaChevronRight className="text-[10px] text-gray-400" />
            </li>
            <li className="font-semibold text-gray-800 dark:text-gray-200" aria-current="page">
              Shopping Bag
            </li>
          </ol>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-[#9B4F5E] dark:hover:text-rose-300 transition-colors"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Continue Shopping</span>
          </Link>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Shopping Bag
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isLoading
                ? "Checking your bag..."
                : isEmpty
                ? "Your bag is currently empty"
                : `Review and manage your ${items.length} chosen beauty ${
                    items.length === 1 ? "ritual" : "rituals"
                  }`}
            </p>
          </div>

          {isUpdating && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#9B4F5E] dark:text-rose-300 font-medium">
              <FaSpinner className="animate-spin text-xs" />
              <span>Updating bag...</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            </div>
          </div>
        ) : isEmpty ? (
          /* Empty Bag View */
          <EmptyCartView />
        ) : (
          /* Two-Column Responsive Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20 sm:pb-0">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8">
              <CartItemList
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onUpdateVariant={updateVariant}
                onRemove={removeFromCart}
                onClearCart={clearCart}
                onNotify={showToast}
              />
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-4">
              <CartSummary cart={cart} onNotify={showToast} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Checkout Bar (Active only when items exist) */}
      {!isLoading && !isEmpty && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-3.5 shadow-lg">
          <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Estimated Total
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ৳{Number(cart?.estimatedTotal || cart?.subtotal || 0).toLocaleString()}
              </span>
            </div>

            {cart?.hasBlockingIssues ? (
              <button
                type="button"
                disabled
                className="py-3 px-5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-400 text-xs font-semibold cursor-not-allowed"
              >
                {items.some((it) => it.requiresVariantSelection) ? "Select Options" : "Resolve Stock"}
              </button>
            ) : (
              <Link
                href="/checkout"
                className="py-3 px-6 rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FaLock className="text-[10px]" />
                <span>Checkout</span>
              </Link>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

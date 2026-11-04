"use client";

import { useState } from "react";
import CartItem from "./CartItem";
import { FaTrashAlt, FaExclamationTriangle, FaShoppingBag } from "react-icons/fa";

export default function CartItemList({
  cart,
  onUpdateQuantity,
  onRemove,
  onClearCart,
  onNotify,
}) {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await onClearCart();
      if (res?.success) {
        if (onNotify) onNotify("Your shopping bag has been cleared.");
      } else if (res?.message) {
        if (onNotify) onNotify(res.message);
      }
    } finally {
      setIsClearing(false);
      setShowConfirmClear(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Item Count & Clear Bag */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <FaShoppingBag className="text-gray-400 text-sm" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {cart.items.length} {cart.items.length === 1 ? "Product" : "Products"} ({cart.itemCount} Units)
          </span>
        </div>

        {cart.items.length > 0 && (
          <div>
            {showConfirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Clear bag?</span>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 underline cursor-pointer"
                >
                  {isClearing ? "Clearing..." : "Yes, clear"}
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowConfirmClear(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer ml-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowConfirmClear(true)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <FaTrashAlt className="text-[11px]" />
                <span>Clear Bag</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Global Stock Issues Notice */}
      {cart.hasBlockingIssues && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
          <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 text-base mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <p className="font-semibold mb-0.5">Attention needed before checkout</p>
            <p>
              Some items in your bag are currently out of stock or requested in a quantity that exceeds available stock. Please adjust quantities or remove unavailable products to complete your order.
            </p>
          </div>
        </div>
      )}

      {/* List of Cart Items */}
      <div className="space-y-3">
        {cart.items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
            onNotify={onNotify}
          />
        ))}
      </div>
    </div>
  );
}


"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cartService } from "@/services/cartService";

const CartContext = createContext(null);

const DEFAULT_CART = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  regularSubtotal: 0,
  totalDiscount: 0,
  estimatedDeliveryFee: 0,
  estimatedTotal: 0,
  hasBlockingIssues: false,
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(DEFAULT_CART);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart on initial mount
  useEffect(() => {
    let isSubscribed = true;

    async function loadCart() {
      try {
        const res = await cartService.getCart();
        if (isSubscribed && res?.success && res.data) {
          setCart(res.data);
          setError(null);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.message || "Failed to load shopping cart.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadCart();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const res = await cartService.getCart();
      if (res?.success && res.data) {
        setCart(res.data);
        setError(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load shopping cart.");
    }
  }, []);

  /**
   * Add a product to the cart
   */
  const addToCart = async (productId, quantity = 1, variantId = null) => {
    setIsUpdating(true);
    try {
      const res = await cartService.addItem(productId, quantity, variantId);
      if (res?.success && res.data) {
        setCart(res.data);
        return { success: true, message: res.message || "Added to bag." };
      }
      return { success: false, message: "Failed to add item." };
    } catch (err) {
      return { success: false, message: err.message || "Failed to add item." };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Update quantity of an item with optimistic UI update and safe rollback
   */
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return { success: false, message: "Quantity must be at least 1." };

    const previousCart = { ...cart };

    // Optimistic UI update
    setCart((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const lineTotal = item.unitPrice * newQuantity;
          const lineRegularTotal = item.regularPrice * newQuantity;
          return {
            ...item,
            quantity: newQuantity,
            lineTotal,
            lineRegularTotal,
            lineDiscount: lineRegularTotal - lineTotal,
            exceedsStock: newQuantity > item.stockQuantity,
          };
        }
        return item;
      });

      const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.lineTotal : 0), 0);
      const newRegular = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.lineRegularTotal : 0), 0);
      const newCount = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.quantity : 0), 0);
      const deliveryFee = newSubtotal > 0 ? 70 : 0;

      return {
        ...prev,
        items: updatedItems,
        itemCount: newCount,
        subtotal: newSubtotal,
        regularSubtotal: newRegular,
        totalDiscount: newRegular - newSubtotal,
        estimatedDeliveryFee: deliveryFee,
        estimatedTotal: newSubtotal + deliveryFee,
      };
    });

    setIsUpdating(true);
    try {
      const res = await cartService.updateQuantity(itemId, newQuantity);
      if (res?.success && res.data) {
        setCart(res.data);
        return { success: true };
      }
      // Rollback on non-success
      setCart(previousCart);
      return { success: false, message: "Failed to update item quantity." };
    } catch (err) {
      // Rollback on exception
      setCart(previousCart);
      return { success: false, message: err.message || "Failed to update quantity." };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Remove an item from the cart with optimistic UI update and rollback
   */
  const removeFromCart = async (itemId) => {
    const previousCart = { ...cart };

    // Optimistic UI removal
    setCart((prev) => {
      const updatedItems = prev.items.filter((it) => it.id !== itemId);
      const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.lineTotal : 0), 0);
      const newRegular = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.lineRegularTotal : 0), 0);
      const newCount = updatedItems.reduce((acc, it) => acc + (it.isAvailable && !it.isOutOfStock ? it.quantity : 0), 0);
      const deliveryFee = newSubtotal > 0 ? 70 : 0;

      return {
        ...prev,
        items: updatedItems,
        itemCount: newCount,
        subtotal: newSubtotal,
        regularSubtotal: newRegular,
        totalDiscount: newRegular - newSubtotal,
        estimatedDeliveryFee: deliveryFee,
        estimatedTotal: newSubtotal + deliveryFee,
      };
    });

    setIsUpdating(true);
    try {
      const res = await cartService.removeItem(itemId);
      if (res?.success && res.data) {
        setCart(res.data);
        return { success: true };
      }
      setCart(previousCart);
      return { success: false, message: "Failed to remove item." };
    } catch (err) {
      setCart(previousCart);
      return { success: false, message: err.message || "Failed to remove item." };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Clear all items in the cart
   */
  const clearCart = async () => {
    setIsUpdating(true);
    try {
      const res = await cartService.clearCart();
      if (res?.success && res.data) {
        setCart(res.data);
        return { success: true };
      }
      return { success: false, message: "Failed to clear cart." };
    } catch (err) {
      return { success: false, message: err.message || "Failed to clear cart." };
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount: cart.itemCount || 0,
        isLoading,
        isUpdating,
        error,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

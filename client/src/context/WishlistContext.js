"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { wishlistService } from "@/services/wishlistService";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

const WishlistContext = createContext(null);

const GUEST_WISHLIST_KEY = "eloura_guest_wishlist";

function getGuestWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestWishlist(ids) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

export function WishlistProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const { addToCart, refreshCart } = useCart();
  const [wishlistIds, setWishlistIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousUserRef = useRef(null);

  // Sync wishlist on mount and user auth change
  useEffect(() => {
    if (authLoading) return;

    let isSubscribed = true;

    async function syncWishlist() {
      setIsLoading(true);

      if (user) {
        try {
          // If customer just logged in, check for guest items to merge
          const guestIds = getGuestWishlist();
          if (guestIds.length > 0) {
            try {
              const mergeRes = await wishlistService.mergeGuestWishlist(guestIds);
              if (isSubscribed && mergeRes?.data?.wishlistIds) {
                setWishlistIds(mergeRes.data.wishlistIds);
                if (typeof window !== "undefined") {
                  localStorage.removeItem(GUEST_WISHLIST_KEY);
                }
                return;
              }
            } catch {
              // Fall through to regular fetch if merge fails
            }
            if (typeof window !== "undefined") {
              localStorage.removeItem(GUEST_WISHLIST_KEY);
            }
          }

          // Fetch user's wishlist IDs
          const res = await wishlistService.getWishlistIds();
          if (isSubscribed && res?.success && Array.isArray(res.data)) {
            setWishlistIds(res.data);
          }
        } catch {
          if (isSubscribed) {
            setWishlistIds([]);
          }
        } finally {
          if (isSubscribed) setIsLoading(false);
        }
      } else {
        // Guest user: load from localStorage
        const storedIds = getGuestWishlist();
        if (isSubscribed) {
          setWishlistIds(storedIds);
          setIsLoading(false);
        }
      }

      previousUserRef.current = user?.id || null;
    }

    syncWishlist();

    return () => {
      isSubscribed = false;
    };
  }, [user, authLoading]);

  // Check if a product is in wishlist
  const isWishlisted = useCallback(
    (productId) => {
      if (!productId) return false;
      return wishlistIds.includes(productId);
    },
    [wishlistIds]
  );

  // Refresh wishlist IDs from source
  const refreshWishlist = useCallback(async () => {
    if (user) {
      try {
        const res = await wishlistService.getWishlistIds();
        if (res?.success && Array.isArray(res.data)) {
          setWishlistIds(res.data);
        }
      } catch {
        // Non-blocking
      }
    } else {
      setWishlistIds(getGuestWishlist());
    }
  }, [user]);

  /**
   * Toggle product in wishlist (optimistic update with automatic rollback)
   */
  const toggleWishlist = async (productId, variantId = null) => {
    if (!productId) return { wishlisted: false };

    const wasWishlisted = wishlistIds.includes(productId);
    const newWishlisted = !wasWishlisted;

    // Optimistically update local state immediately
    const nextIds = newWishlisted
      ? [productId, ...wishlistIds.filter((id) => id !== productId)]
      : wishlistIds.filter((id) => id !== productId);

    setWishlistIds(nextIds);

    if (user) {
      setIsUpdating(true);
      try {
        const res = await wishlistService.toggleItem(productId, variantId);
        return {
          wishlisted: res?.data?.wishlisted ?? newWishlisted,
          message: res?.data?.message || (newWishlisted ? "Added to wishlist" : "Removed from wishlist"),
        };
      } catch (err) {
        // Rollback state on error
        setWishlistIds(wishlistIds);
        return {
          wishlisted: wasWishlisted,
          error: err.message || "Failed to update wishlist.",
        };
      } finally {
        setIsUpdating(false);
      }
    } else {
      // Guest mode: update localStorage
      saveGuestWishlist(nextIds);
      return {
        wishlisted: newWishlisted,
        message: newWishlisted ? "Saved to your guest wishlist" : "Removed from your wishlist",
      };
    }
  };

  /**
   * Explicitly add product to wishlist
   */
  const addToWishlist = async (productId, variantId = null) => {
    if (!productId || wishlistIds.includes(productId)) {
      return { wishlisted: true };
    }
    return toggleWishlist(productId, variantId);
  };

  /**
   * Explicitly remove product from wishlist
   */
  const removeFromWishlist = async (productId, variantId = null) => {
    if (!productId || !wishlistIds.includes(productId)) {
      return { wishlisted: false };
    }
    return toggleWishlist(productId, variantId);
  };

  /**
   * Move wishlisted product to shopping cart
   */
  const moveToCart = async (productId, quantity = 1) => {
    if (!productId) return { success: false, message: "Invalid product" };

    setIsUpdating(true);
    try {
      if (user) {
        const res = await wishlistService.moveToCart(productId, quantity);
        setWishlistIds((prev) => prev.filter((id) => id !== productId));
        if (typeof refreshCart === "function") {
          await refreshCart();
        }
        return {
          success: true,
          message: res?.data?.message || "Moved to shopping bag.",
        };
      } else {
        // Guest mode: add to cart using CartContext, remove from guest wishlist
        if (typeof addToCart === "function") {
          const cartRes = await addToCart(productId, quantity);
          if (cartRes?.success) {
            const nextIds = wishlistIds.filter((id) => id !== productId);
            setWishlistIds(nextIds);
            saveGuestWishlist(nextIds);
            return { success: true, message: "Moved to shopping bag." };
          }
          return cartRes;
        }
        return { success: false, message: "Cart service not ready." };
      }
    } catch (err) {
      return { success: false, message: err.message || "Failed to move product to bag." };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Clear all items from wishlist
   */
  const clearWishlist = async () => {
    setIsUpdating(true);
    try {
      if (user) {
        await wishlistService.clearWishlist();
      } else {
        saveGuestWishlist([]);
      }
      setWishlistIds([]);
      return { success: true, message: "Wishlist cleared." };
    } catch (err) {
      return { success: false, message: err.message || "Failed to clear wishlist." };
    } finally {
      setIsUpdating(false);
    }
  };

  const value = {
    wishlistIds,
    wishlistCount: wishlistIds.length,
    isLoading,
    isUpdating,
    isWishlisted,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    moveToCart,
    clearWishlist,
    refreshWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}


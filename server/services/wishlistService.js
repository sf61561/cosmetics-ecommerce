const wishlistRepository = require("../repositories/wishlistRepository");
const productRepository = require("../repositories/productRepository");
const cartService = require("./cartService");
const interactionService = require("./interactionService");

const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

class WishlistService {
  /**
   * Get paginated wishlist with live prices, stock and metadata
   */
  async getWishlist(userId, queryParams = {}) {
    return wishlistRepository.findWishlistItems(userId, queryParams);
  }

  /**
   * Fast list of wishlisted product IDs
   */
  async getWishlistIds(userId) {
    return wishlistRepository.findWishlistProductIds(userId);
  }

  /**
   * Add a product to the user's wishlist
   */
  async addItem(userId, { productId, variantId = null }) {
    if (!productId || typeof productId !== "string" || !isUUID(productId.trim())) {
      const error = new Error("Valid product ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const cleanProductId = productId.trim();
    const cleanVariantId = variantId && typeof variantId === "string" && isUUID(variantId.trim())
      ? variantId.trim()
      : null;

    // Check if product exists
    const product = await productRepository.findById(cleanProductId);
    if (!product) {
      const error = new Error("Product not found.");
      error.statusCode = 404;
      throw error;
    }

    await wishlistRepository.addItem(userId, cleanProductId, cleanVariantId);

    // Record interaction for recommendation engine (non-blocking)
    try {
      await interactionService.recordClientInteraction({
        userId,
        productId: cleanProductId,
        type: "WISHLIST",
      });
    } catch {
      // Ignore recommendation interaction recording failure
    }

    return {
      wishlisted: true,
      productId: cleanProductId,
      message: "Added to your wishlist.",
    };
  }

  /**
   * Remove a product from the user's wishlist
   */
  async removeItem(userId, productId, variantId = null) {
    if (!productId || typeof productId !== "string" || !isUUID(productId.trim())) {
      const error = new Error("Valid product ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const cleanProductId = productId.trim();
    const cleanVariantId = variantId && typeof variantId === "string" && isUUID(variantId.trim())
      ? variantId.trim()
      : null;

    await wishlistRepository.removeItem(userId, cleanProductId, cleanVariantId);

    return {
      wishlisted: false,
      productId: cleanProductId,
      message: "Removed from your wishlist.",
    };
  }

  /**
   * Toggle product in wishlist: add if missing, remove if present
   */
  async toggleItem(userId, { productId, variantId = null }) {
    if (!productId || typeof productId !== "string" || !isUUID(productId.trim())) {
      const error = new Error("Valid product ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const cleanProductId = productId.trim();
    const cleanVariantId = variantId && typeof variantId === "string" && isUUID(variantId.trim())
      ? variantId.trim()
      : null;

    const existing = await wishlistRepository.findWishlistItem(userId, cleanProductId, cleanVariantId);

    if (existing) {
      await wishlistRepository.removeItem(userId, cleanProductId, cleanVariantId);
      return {
        wishlisted: false,
        productId: cleanProductId,
        message: "Removed from your wishlist.",
      };
    } else {
      // Check product existence
      const product = await productRepository.findById(cleanProductId);
      if (!product) {
        const error = new Error("Product not found.");
        error.statusCode = 404;
        throw error;
      }

      await wishlistRepository.addItem(userId, cleanProductId, cleanVariantId);

      try {
        await interactionService.recordClientInteraction({
          userId,
          productId: cleanProductId,
          type: "WISHLIST",
        });
      } catch {
        // Non-blocking
      }

      return {
        wishlisted: true,
        productId: cleanProductId,
        message: "Added to your wishlist.",
      };
    }
  }

  /**
   * Move item from wishlist into shopping bag
   */
  async moveToCart(userId, productId, { quantity = 1, sessionId = null } = {}) {
    if (!productId || typeof productId !== "string" || !isUUID(productId.trim())) {
      const error = new Error("Valid product ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const cleanProductId = productId.trim();

    // 1. Add to cart
    const cart = await cartService.addItem({
      userId,
      sessionId,
      productId: cleanProductId,
      quantity,
    });

    // 2. Remove from wishlist
    await wishlistRepository.removeItem(userId, cleanProductId);

    return {
      success: true,
      message: "Product moved to shopping bag.",
      cart,
    };
  }

  /**
   * Clear all items from user's wishlist
   */
  async clearWishlist(userId) {
    const clearedCount = await wishlistRepository.clearWishlist(userId);
    return {
      success: true,
      clearedCount,
      message: "Wishlist cleared successfully.",
    };
  }

  /**
   * Merge guest product IDs into user's DB wishlist on sign-in
   */
  async mergeGuestWishlist(userId, productIds = []) {
    const mergedCount = await wishlistRepository.mergeGuestItems(userId, productIds);
    const wishlistIds = await wishlistRepository.findWishlistProductIds(userId);
    return {
      success: true,
      mergedCount,
      wishlistIds,
    };
  }
}

module.exports = new WishlistService();


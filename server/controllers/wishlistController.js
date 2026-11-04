const wishlistService = require("../services/wishlistService");

class WishlistController {
  /**
   * GET /api/wishlist
   * Get paginated wishlist items for authenticated user
   */
  async getWishlist(req, res, next) {
    try {
      const data = await wishlistService.getWishlist(req.user.id, req.query);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/wishlist/ids
   * Fast retrieval of wishlisted product IDs for icon status hydration
   */
  async getWishlistIds(req, res, next) {
    try {
      const data = await wishlistService.getWishlistIds(req.user.id);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wishlist
   * Add a product to wishlist
   */
  async addItem(req, res, next) {
    try {
      const { productId, variantId } = req.body;
      const data = await wishlistService.addItem(req.user.id, { productId, variantId });
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/wishlist/:productId
   * Remove a product from wishlist
   */
  async removeItem(req, res, next) {
    try {
      const { productId } = req.params;
      const { variantId } = req.query;
      const data = await wishlistService.removeItem(req.user.id, productId, variantId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wishlist/toggle
   * Toggle product in wishlist (adds if absent, removes if present)
   */
  async toggleItem(req, res, next) {
    try {
      const { productId, variantId } = req.body;
      const data = await wishlistService.toggleItem(req.user.id, { productId, variantId });
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wishlist/:productId/move-to-cart
   * Move wishlisted product to shopping cart and remove from wishlist
   */
  async moveToCart(req, res, next) {
    try {
      const { productId } = req.params;
      const { quantity } = req.body || {};
      const sessionId = req.cookies?.rupkotha_cart_session || null;
      const data = await wishlistService.moveToCart(req.user.id, productId, {
        quantity,
        sessionId,
      });
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/wishlist
   * Clear all items in user's wishlist
   */
  async clearWishlist(req, res, next) {
    try {
      const data = await wishlistService.clearWishlist(req.user.id);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/wishlist/merge
   * Merge guest wishlist array into user's DB wishlist on login
   */
  async mergeGuestWishlist(req, res, next) {
    try {
      const { productIds } = req.body || {};
      const data = await wishlistService.mergeGuestWishlist(req.user.id, productIds);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WishlistController();


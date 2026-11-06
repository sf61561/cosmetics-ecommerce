const cartService = require("../services/cartService");

class CartController {
  /**
   * GET /api/cart
   * Retrieve active cart for current authenticated customer or guest session
   */
  async getCart(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;
      const cart = await cartService.getCart({ userId, sessionId });

      return res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cart/items
   * Add a product to the cart
   */
  async addItem(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;
      const { productId, variantId = null, quantity = 1 } = req.body;

      const cart = await cartService.addItem({
        userId,
        sessionId,
        productId,
        variantId,
        quantity,
      });

      return res.status(200).json({
        success: true,
        message: "Item added to your bag.",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/cart/items/:id
   * Update quantity or variant of a cart item
   */
  async updateQuantity(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;
      const itemId = req.params.id;
      const { quantity, variantId } = req.body;

      let cart;
      if (variantId !== undefined && variantId !== null) {
        cart = await cartService.updateVariant({
          userId,
          sessionId,
          itemId,
          variantId,
        });
      } else {
        cart = await cartService.updateQuantity({
          userId,
          sessionId,
          itemId,
          quantity,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Cart updated.",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/cart/items/:id/variant
   * Update variant of a specific cart item
   */
  async updateVariant(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;
      const itemId = req.params.id;
      const { variantId } = req.body;

      const cart = await cartService.updateVariant({
        userId,
        sessionId,
        itemId,
        variantId,
      });

      return res.status(200).json({
        success: true,
        message: "Variant updated.",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/cart/items/:id
   * Remove a specific item from cart
   */
  async removeItem(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;
      const itemId = req.params.id;

      const cart = await cartService.removeItem({
        userId,
        sessionId,
        itemId,
      });

      return res.status(200).json({
        success: true,
        message: "Item removed from bag.",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/cart
   * Clear all items from cart
   */
  async clearCart(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const sessionId = req.sessionId;

      const cart = await cartService.clearCart({
        userId,
        sessionId,
      });

      return res.status(200).json({
        success: true,
        message: "Cart cleared.",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();


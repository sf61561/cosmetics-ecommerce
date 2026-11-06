const cartRepository = require("../repositories/cartRepository");
const productRepository = require("../repositories/productRepository");
const variantRepository = require("../repositories/variantRepository");
const interactionRepository = require("../repositories/interactionRepository");

class CartService {
  /**
   * Helper: formats raw DB cart items into consistent API objects and computes accurate totals
   */
  formatCart(rawItems = []) {
    let itemCount = 0;
    let subtotal = 0;
    let regularSubtotal = 0;
    let hasBlockingIssues = false;

    const items = rawItems.map((row) => {
      const hasVariantCompare =
        row.variant_compare_at_price !== null && Number(row.variant_compare_at_price) > 0;
      const regularPrice = hasVariantCompare
        ? Number(row.variant_compare_at_price)
        : (row.variant_price !== null ? Number(row.variant_price) : (Number(row.regular_price) || 0));
      const unitPrice =
        row.variant_price !== null
          ? Number(row.variant_price)
          : (row.sale_price ? Number(row.sale_price) : regularPrice);
      const salePrice = hasVariantCompare
        ? unitPrice
        : (row.sale_price ? Number(row.sale_price) : null);
      const hasDiscount = regularPrice > unitPrice;
      const quantity = Number(row.quantity) || 1;
      const stockQuantity = Number(row.stock_quantity) || 0;

      const hasCustomVariants = Number(row.custom_variant_count) > 0;
      const requiresVariantSelection = hasCustomVariants && !row.variant_id;

      const variantActive = row.variant_is_active !== false;
      const variantAvailable = row.variant_is_available !== false;

      const isPublished =
        row.product_status === "ACTIVE" &&
        variantActive &&
        (!row.published_at || new Date(row.published_at) <= new Date());
      const isOutOfStock = stockQuantity <= 0 || !variantAvailable;
      const exceedsStock = quantity > stockQuantity;

      if (!isPublished || isOutOfStock || exceedsStock || requiresVariantSelection) {
        hasBlockingIssues = true;
      }

      const lineTotal = unitPrice * quantity;
      const lineRegularTotal = regularPrice * quantity;

      if (isPublished && !isOutOfStock) {
        itemCount += quantity;
        subtotal += lineTotal;
        regularSubtotal += lineRegularTotal;
      }

      return {
        id: row.cart_item_id,
        productId: row.product_id,
        variantId: row.variant_id || null,
        variantName: row.variant_name || null,
        requiresVariantSelection,
        hasCustomVariants,
        availableVariants: Array.isArray(row.available_variants) ? row.available_variants : [],
        name: row.product_name,
        slug: row.product_slug,
        sku: row.product_sku,
        volume: row.volume || null,
        brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
        category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
        thumbnailUrl:
          row.variant_image_url ||
          row.thumbnail_url ||
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80",
        regularPrice,
        salePrice,
        unitPrice,
        hasDiscount,
        quantity,
        stockQuantity,
        lineTotal,
        lineRegularTotal,
        lineDiscount: lineRegularTotal - lineTotal,
        isAvailable: isPublished && variantAvailable,
        isOutOfStock,
        exceedsStock,
        maxAvailable: Math.max(0, stockQuantity),
      };
    });

    const totalDiscount = regularSubtotal - subtotal;
    // Standard baseline delivery fee inside Dhaka (৳70)
    const estimatedDeliveryFee = subtotal > 0 ? 70 : 0;
    const estimatedTotal = subtotal + estimatedDeliveryFee;

    return {
      items,
      itemCount,
      subtotal,
      regularSubtotal,
      totalDiscount,
      estimatedDeliveryFee,
      estimatedTotal,
      hasBlockingIssues,
    };
  }

  /**
   * Retrieve customer or guest cart
   */
  async getCart({ userId = null, sessionId = null }) {
    // If authenticated and previous guest session exists, auto-merge
    if (userId && sessionId) {
      await cartRepository.mergeGuestCart(userId, sessionId);
    }

    const rawItems = await cartRepository.findCartItems({ userId, sessionId });
    return this.formatCart(rawItems);
  }

  /**
   * Add a product or variant to the cart
   */
  async addItem({ userId = null, sessionId = null, productId, variantId = null, quantity = 1 }) {
    if (!productId) {
      const error = new Error("Product ID is required.");
      error.status = 400;
      throw error;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      const error = new Error("Quantity must be a positive integer.");
      error.status = 400;
      throw error;
    }

    // 1. Verify product exists and is active
    const product = await productRepository.findById(productId);
    if (!product || product.status !== "ACTIVE") {
      const error = new Error("This product is currently unavailable.");
      error.status = 404;
      throw error;
    }

    if (product.publishedAt && new Date(product.publishedAt) > new Date()) {
      const error = new Error("This product is not yet available for purchase.");
      error.status = 404;
      throw error;
    }

    if (product.stockQuantity <= 0) {
      const error = new Error(`'${product.name}' is currently out of stock.`);
      error.status = 400;
      error.code = "OUT_OF_STOCK";
      throw error;
    }

    // Check variant requirements
    let targetVariantId = variantId || null;
    const variants = await variantRepository.getVariantsByProductId(productId);
    const hasCustomVariants = variants.some((v) => v.optionsKey !== "default");

    if (hasCustomVariants) {
      if (targetVariantId) {
        const matched = variants.find((v) => v.id === targetVariantId && v.isActive);
        if (!matched) {
          const error = new Error("Selected product option is not available.");
          error.status = 404;
          error.code = "VARIANT_NOT_FOUND";
          throw error;
        }
        if (!matched.isAvailable) {
          const error = new Error("Selected product option is currently out of stock.");
          error.status = 400;
          error.code = "OUT_OF_STOCK";
          throw error;
        }
      }
      // If targetVariantId is null, allow adding to cart without pre-selecting variant
    } else if (!targetVariantId && variants.length > 0) {
      // Single product: auto-select default variant
      const defaultVar = variants.find((v) => v.optionsKey === "default") || variants[0];
      if (defaultVar) {
        targetVariantId = defaultVar.id;
      }
    }

    // 2. Check existing cart quantity
    const existing = await cartRepository.findExistingItem({
      userId,
      sessionId,
      productId,
      variantId: targetVariantId,
    });
    const currentQtyInCart = existing ? existing.quantity : 0;
    const targetQty = currentQtyInCart + parsedQty;

    if (targetQty > product.stockQuantity) {
      const availableToAdd = product.stockQuantity - currentQtyInCart;
      const error = new Error(
        availableToAdd > 0
          ? `You already have ${currentQtyInCart} in your bag. Only ${availableToAdd} more can be added.`
          : `You already have the maximum available stock (${product.stockQuantity}) in your bag.`
      );
      error.status = 400;
      error.code = "STOCK_EXCEEDED";
      throw error;
    }

    // 3. Persist item
    await cartRepository.addItem({
      userId,
      sessionId,
      productId,
      variantId: targetVariantId,
      quantity: parsedQty,
    });

    // 4. Record ADD_TO_CART interaction asynchronously for recommendation engine
    try {
      await interactionRepository.create({
        userId,
        sessionId,
        productId,
        interactionType: "ADD_TO_CART",
      });
    } catch {
      // Non-blocking fail-safe
    }

    return this.getCart({ userId, sessionId });
  }

  /**
   * Update quantity of an existing cart item
   */
  async updateQuantity({ userId = null, sessionId = null, itemId, quantity }) {
    if (!itemId) {
      const error = new Error("Cart item ID is required.");
      error.status = 400;
      throw error;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      const error = new Error("Quantity must be at least 1.");
      error.status = 400;
      throw error;
    }

    const item = await cartRepository.findItemById(itemId);
    if (!item) {
      const error = new Error("Cart item not found.");
      error.status = 404;
      throw error;
    }

    // Verify ownership
    const isOwner =
      (userId && item.user_id === userId) ||
      (!userId && sessionId && item.session_id === sessionId);

    if (!isOwner) {
      const error = new Error("Unauthorized to modify this cart item.");
      error.status = 403;
      throw error;
    }

    // Verify against product stock
    if (parsedQty > item.stock_quantity) {
      const error = new Error(
        `Only ${item.stock_quantity} units are available in stock.`
      );
      error.status = 400;
      error.code = "STOCK_EXCEEDED";
      throw error;
    }

    await cartRepository.updateItemQuantity(itemId, parsedQty);
    return this.getCart({ userId, sessionId });
  }

  /**
   * Update variant of an existing cart item
   */
  async updateVariant({ userId = null, sessionId = null, itemId, variantId }) {
    if (!itemId) {
      const error = new Error("Cart item ID is required.");
      error.status = 400;
      throw error;
    }
    if (!variantId) {
      const error = new Error("Variant ID is required.");
      error.status = 400;
      throw error;
    }

    const item = await cartRepository.findItemById(itemId);
    if (!item) {
      const error = new Error("Cart item not found.");
      error.status = 404;
      throw error;
    }

    // Verify ownership
    const isOwner =
      (userId && item.user_id === userId) ||
      (!userId && sessionId && item.session_id === sessionId);

    if (!isOwner) {
      const error = new Error("Unauthorized to modify this cart item.");
      error.status = 403;
      throw error;
    }

    // Verify variant belongs to this product and is available
    const variant = await variantRepository.findVariantById(variantId);
    if (!variant || variant.productId !== item.product_id || !variant.isActive) {
      const error = new Error("Selected variant is invalid or unavailable.");
      error.status = 404;
      throw error;
    }
    if (!variant.isAvailable) {
      const error = new Error("Selected variant is currently out of stock.");
      error.status = 400;
      error.code = "OUT_OF_STOCK";
      throw error;
    }

    // Check if another cart item already exists with this same variant for this user/session
    const existing = await cartRepository.findExistingItem({
      userId,
      sessionId,
      productId: item.product_id,
      variantId,
    });

    if (existing && existing.id !== itemId) {
      const mergedQty = existing.quantity + item.quantity;
      await cartRepository.updateItemQuantity(existing.id, mergedQty);
      await cartRepository.removeItem(itemId);
    } else {
      await cartRepository.updateItemVariant(itemId, variantId);
    }

    return this.getCart({ userId, sessionId });
  }

  /**
   * Remove a specific item from cart
   */
  async removeItem({ userId = null, sessionId = null, itemId }) {
    if (!itemId) {
      const error = new Error("Cart item ID is required.");
      error.status = 400;
      throw error;
    }

    const item = await cartRepository.findItemById(itemId);
    if (!item) {
      // Already removed or not found
      return this.getCart({ userId, sessionId });
    }

    const isOwner =
      (userId && item.user_id === userId) ||
      (!userId && sessionId && item.session_id === sessionId);

    if (!isOwner) {
      const error = new Error("Unauthorized to remove this cart item.");
      error.status = 403;
      throw error;
    }

    await cartRepository.removeItem(itemId);
    return this.getCart({ userId, sessionId });
  }

  /**
   * Clear all items in cart
   */
  async clearCart({ userId = null, sessionId = null }) {
    await cartRepository.clearCart({ userId, sessionId });
    return this.getCart({ userId, sessionId });
  }
}

module.exports = new CartService();


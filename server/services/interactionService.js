const interactionRepository = require("../repositories/interactionRepository");
const config = require("../config/recommendationConfig");

// UUID validation regex
const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const ALLOWED_CLIENT_TYPES = ["VIEW", "ADD_TO_CART", "WISHLIST"];

const interactionService = {
  /**
   * Record a customer interaction via client API
   */
  async recordClientInteraction({ userId = null, sessionId = null, productId, type }) {
    // 1. Validate Product ID
    if (!productId || typeof productId !== "string" || !isUUID(productId.trim())) {
      const error = new Error("Invalid or missing product ID.");
      error.statusCode = 400;
      error.field = "productId";
      throw error;
    }
    const cleanProductId = productId.trim();

    // 2. Validate Interaction Type
    if (!type || typeof type !== "string") {
      const error = new Error("Interaction type is required.");
      error.statusCode = 400;
      error.field = "type";
      throw error;
    }

    const cleanType = type.trim().toUpperCase();

    // Strict security rule: Client can NEVER claim a PURCHASE interaction
    if (cleanType === "PURCHASE") {
      const error = new Error(
        "Purchase interactions cannot be reported via the generic interaction endpoint. They are strictly recorded by the server-side order workflow."
      );
      error.statusCode = 403;
      error.field = "type";
      throw error;
    }

    if (!ALLOWED_CLIENT_TYPES.includes(cleanType)) {
      const error = new Error(
        `Unsupported interaction type '${cleanType}'. Allowed types: ${ALLOWED_CLIENT_TYPES.join(", ")}`
      );
      error.statusCode = 400;
      error.field = "type";
      throw error;
    }

    // 3. Ensure product exists and is ACTIVE
    const product = await interactionRepository.checkProductActive(cleanProductId);
    if (!product || product.status !== "ACTIVE") {
      const error = new Error("Product does not exist or is unavailable for interaction.");
      error.statusCode = 404;
      error.field = "productId";
      throw error;
    }

    // 4. Rate-limiting & debouncing: Ignore duplicate interaction within debounce window
    const isDebounced = await interactionRepository.isDebounced({
      userId,
      sessionId,
      productId: cleanProductId,
      interactionType: cleanType,
      windowSeconds: config.limits.debounceWindowSeconds,
    });

    if (isDebounced) {
      return {
        debounced: true,
        message: "Interaction recorded recently (debounced).",
        productId: cleanProductId,
        type: cleanType,
      };
    }

    // 5. Persist interaction
    const record = await interactionRepository.create({
      userId,
      sessionId,
      productId: cleanProductId,
      interactionType: cleanType,
    });

    return {
      debounced: false,
      id: record.id,
      productId: record.product_id,
      type: record.interaction_type,
      createdAt: record.created_at,
    };
  },

  /**
   * Trusted Server-Side Helper: Record a purchase from verified order processing
   */
  async recordOrderPurchase({ userId, productId }, client = null) {
    if (!userId || !productId) return null;
    return interactionRepository.create(
      {
        userId,
        sessionId: null,
        productId,
        interactionType: "PURCHASE",
      },
      client
    );
  },
};

module.exports = interactionService;


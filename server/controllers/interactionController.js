const interactionService = require("../services/interactionService");

class InteractionController {
  /**
   * POST /api/interactions
   * Record client-side customer activity (VIEW, ADD_TO_CART, WISHLIST)
   */
  async record(req, res, next) {
    try {
      const { productId, type } = req.body;

      // Authenticated customer isolation: NEVER trust customer ID from req.body
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || null;

      const result = await interactionService.recordClientInteraction({
        userId,
        sessionId,
        productId,
        type,
      });

      return res.status(result.debounced ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InteractionController();


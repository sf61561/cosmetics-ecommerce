const recommendationService = require("../services/recommendationService");

class RecommendationController {
  /**
   * GET /api/recommendations?limit=12
   * Returns rule-based personalized product recommendations for the customer (or guest)
   */
  async getRecommendations(req, res, next) {
    try {
      const { limit = 12 } = req.query;
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || null;

      const result = await recommendationService.getPersonalizedRecommendations({
        userId,
        sessionId,
        limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/products/:id/related?limit=8
   * Returns products related by category, brand, and collection, excluding the target product
   */
  async getRelated(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 8 } = req.query;

      const result = await recommendationService.getRelatedProducts({
        productId: id,
        limit,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecommendationController();


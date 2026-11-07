const searchService = require("../services/searchService");

class SearchController {
  /**
   * GET /api/search/suggest?q=...
   * Fast suggestions for autocomplete dropdown
   */
  async getSuggestions(req, res, next) {
    try {
      const { q = "", limit } = req.query;
      const data = await searchService.getSuggestions(q, { limit });
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search?q=...&category=...&brand=...&min=...&max=...&inStock=...&sort=...&page=...
   * Full search results with faceted filters and sorting
   */
  async search(req, res, next) {
    try {
      const {
        q = "",
        collection,
        category,
        brand,
        tag,
        tags,
        min,
        max,
        inStock,
        sort,
        page,
        limit,
      } = req.query;

      const data = await searchService.search(q, {
        collection: collection || category,
        category: category || collection,
        brand,
        tag,
        tags: tags || tag,
        minPrice: min,
        maxPrice: max,
        inStock,
        sort,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SearchController();


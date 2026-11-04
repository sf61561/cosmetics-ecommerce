const searchRepository = require("../repositories/searchRepository");

class SearchService {
  /**
   * Sanitize search input to prevent injection or pathological input
   */
  sanitizeQuery(input) {
    if (!input || typeof input !== "string") return "";
    return input
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Strip control characters
      .slice(0, 100); // Cap to 100 chars
  }

  /**
   * Fast autocomplete suggestions for dropdown
   */
  async getSuggestions(rawQuery, { limit = 6 } = {}) {
    const query = this.sanitizeQuery(rawQuery);
    if (query.length < 2) {
      return {
        query: "",
        products: [],
        categories: [],
        brands: [],
        queries: [],
      };
    }

    return searchRepository.getSuggestions(query, { limit });
  }

  /**
   * Full search with filters, facets, sorting and typo tolerance
   */
  async search(rawQuery, options = {}) {
    const query = this.sanitizeQuery(rawQuery);

    const result = await searchRepository.searchProducts({
      searchTerm: query,
      collection: options.collection || options.category || "",
      category: options.category || options.collection || "",
      brand: options.brand || "",
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      inStock: options.inStock,
      sort: options.sort || "relevance",
      page: options.page || 1,
      limit: options.limit || 20,
    });

    // If 0 results, calculate "Did you mean?" typo suggestion
    let didYouMean = null;
    if (result.total === 0 && query.length >= 2) {
      didYouMean = await searchRepository.getDidYouMean(query);
    }

    return {
      ...result,
      didYouMean,
    };
  }
}

module.exports = new SearchService();


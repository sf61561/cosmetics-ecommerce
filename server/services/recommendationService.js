const interactionRepository = require("../repositories/interactionRepository");
const recommendationRepository = require("../repositories/recommendationRepository");
const config = require("../config/recommendationConfig");

class RecommendationService {
  /**
   * Format raw DB row into safe, customer-facing product payload
   * (Strictly omits cost_price, internal margins, supplier data)
   */
  formatProduct(row) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brand: row.brand_name
        ? {
            id: row.brand_id,
            name: row.brand_name,
            slug: row.brand_slug,
          }
        : null,
      category: row.category_name
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
          }
        : null,
      price: parseFloat(row.price) || 0,
      salePrice: row.sale_price !== null && row.sale_price !== undefined ? parseFloat(row.sale_price) : null,
      stockQuantity: parseInt(row.stock_quantity, 10) || 0,
      thumbnailUrl: row.thumbnail_url || null,
      isFeatured: Boolean(row.is_featured),
      volume: row.volume || null,
      skinType: row.skin_type || null,
      score: row.score !== undefined ? Math.round(row.score * 100) / 100 : undefined,
    };
  }

  /**
   * Main Recommendation Algorithm:
   * Computes personalized recommendations using customer history, category affinity, and brand affinity.
   * Degrades gracefully to curated featured picks and popular products when history is sparse.
   */
  async getPersonalizedRecommendations({ userId = null, sessionId = null, limit = 12 }) {
    const targetLimit = Math.max(
      1,
      Math.min(config.limits.maxRecommendations, parseInt(limit, 10) || config.limits.defaultRecommendations)
    );

    // Step 1: Retrieve customer's recent interaction history
    const history = await interactionRepository.getCustomerHistory({
      userId,
      sessionId,
      maxAgeDays: config.decay.maxAgeDays,
      limit: 100,
    });

    // Step 2: Handle Cold-Start / Empty History
    if (!history || history.length === 0) {
      return this.getFallbackRecommendations(targetLimit, []);
    }

    // Step 3: Compute Direct Product Scores with Time Decay & View Capping
    const productDirectScores = {};
    const productViewCounts = {};
    const categoryScores = {};
    const brandScores = {};

    for (const record of history) {
      const pid = record.product_id;
      const type = record.interaction_type;
      const ageDays = Math.max(0, parseFloat(record.age_days) || 0);

      // Half-life exponential decay factor: (0.5)^(ageDays / halfLifeDays)
      const decayFactor = Math.max(
        config.decay.minDecayFactor,
        Math.pow(0.5, ageDays / config.decay.halfLifeDays)
      );

      const baseWeight = config.weights[type] || 1;

      // View capping: Cap repeated views to avoid bot or refresh skew
      if (type === "VIEW") {
        productViewCounts[pid] = (productViewCounts[pid] || 0) + 1;
        if (productViewCounts[pid] > config.limits.maxCountedViewsPerProduct) {
          continue; // Diminishing returns cap reached
        }
      }

      const effectiveScore = baseWeight * decayFactor;

      // Accumulate direct product score
      productDirectScores[pid] = (productDirectScores[pid] || 0) + effectiveScore;

      // Accumulate category and brand affinity signals
      if (record.category_id) {
        categoryScores[record.category_id] = (categoryScores[record.category_id] || 0) + effectiveScore;
      }
      if (record.brand_id) {
        brandScores[record.brand_id] = (brandScores[record.brand_id] || 0) + effectiveScore;
      }
    }

    // Step 4: Extract Top Customer Interests
    const sortedCategoryIds = Object.keys(categoryScores).sort(
      (a, b) => categoryScores[b] - categoryScores[a]
    );
    const sortedBrandIds = Object.keys(brandScores).sort(
      (a, b) => brandScores[b] - brandScores[a]
    );

    const topCategoryIds = sortedCategoryIds.slice(0, 3);
    const topBrandIds = sortedBrandIds.slice(0, 3);

    // Step 5: Bounded Candidate Retrieval from PostgreSQL
    const candidates = await recommendationRepository.findCandidates({
      categoryIds: topCategoryIds,
      brandIds: topBrandIds,
      limit: 60,
    });

    if (candidates.length === 0) {
      return this.getFallbackRecommendations(targetLimit, []);
    }

    // Step 6: Score Each Candidate Product
    // Formula: Score(p) = DirectScore(p) + CategoryAffinity(p.category) + BrandAffinity(p.brand) + FeaturedBoost
    // - DirectScore: Weight of customer's interactions on p (Purchase: 5, Cart: 4, Wishlist: 3, View: 1) with time decay
    // - CategoryAffinity: +3 when product belongs to customer's active interest categories
    // - BrandAffinity: +2 when product belongs to customer's active interest brands
    // - FeaturedBoost: +0.5 tie-breaker for handpicked featured products
    const scoredCandidates = candidates.map((p) => {
      // 1. Direct Score from customer's interactions on this exact product
      const direct = productDirectScores[p.id] || 0;

      // 2. Category Affinity: Customer has interest in this category
      const catSignal = categoryScores[p.category_id] || 0;
      const catAffinity =
        catSignal > 0
          ? Math.min(1.0, catSignal) * config.affinity.sameCategory
          : 0;

      // 3. Brand Affinity: Customer has interest in this brand
      const brandSignal = brandScores[p.brand_id] || 0;
      const brandAffinity =
        brandSignal > 0
          ? Math.min(1.0, brandSignal) * config.affinity.sameBrand
          : 0;

      // 4. Featured boost
      const featuredBoost = p.is_featured ? 0.5 : 0;

      const totalScore = direct + catAffinity + brandAffinity + featuredBoost;

      return {
        ...p,
        score: totalScore,
      };
    });

    // Step 7: Sort Candidates by Final Score & Tie-Breakers
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.is_featured !== a.is_featured) {
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });

    // Deduplicate candidates by product ID
    const seenIds = new Set();
    const recommended = [];

    for (const c of scoredCandidates) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        recommended.push(c);
        if (recommended.length >= targetLimit) break;
      }
    }

    // Step 8: If recommendations are fewer than requested limit, backfill with curated/popular fallback
    if (recommended.length < targetLimit) {
      const needed = targetLimit - recommended.length;
      const fallbackItems = await this.fetchBackfillProducts(needed, Array.from(seenIds));
      for (const fb of fallbackItems) {
        if (!seenIds.has(fb.id)) {
          seenIds.add(fb.id);
          recommended.push(fb);
          if (recommended.length >= targetLimit) break;
        }
      }
    }

    return {
      success: true,
      data: recommended.map((r) => this.formatProduct(r)),
      strategy: "personalized",
      metadata: {
        totalReturned: recommended.length,
        historyInteractions: history.length,
        topCategoriesCount: topCategoryIds.length,
        topBrandsCount: topBrandIds.length,
      },
    };
  }

  /**
   * Fallback Recommendations:
   * Curated featured picks -> Popular products -> Recent active products
   */
  async getFallbackRecommendations(limit = 12, excludeIds = []) {
    const seenIds = new Set(excludeIds);
    const result = [];

    // 1. Curated Featured Picks
    const featured = await recommendationRepository.getFeaturedProducts(limit, Array.from(seenIds));
    for (const p of featured) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        result.push(p);
        if (result.length >= limit) break;
      }
    }

    // 2. Popular Products (by interactions / views)
    if (result.length < limit) {
      const popular = await recommendationRepository.getPopularProducts(
        limit - result.length,
        Array.from(seenIds)
      );
      for (const p of popular) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          result.push(p);
          if (result.length >= limit) break;
        }
      }
    }

    // 3. Recent Products
    if (result.length < limit) {
      const recent = await recommendationRepository.getRecentProducts(
        limit - result.length,
        Array.from(seenIds)
      );
      for (const p of recent) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          result.push(p);
          if (result.length >= limit) break;
        }
      }
    }

    return {
      success: true,
      data: result.map((r) => this.formatProduct(r)),
      strategy: "curated_picks",
      metadata: {
        totalReturned: result.length,
        isFallback: true,
      },
    };
  }

  /**
   * Helper to fetch supplementary products when personalized candidate set is smaller than requested limit
   */
  async fetchBackfillProducts(limit, excludeIds) {
    const fallbackRes = await this.getFallbackRecommendations(limit, excludeIds);
    return fallbackRes.data || [];
  }

  /**
   * Related Products Endpoint logic:
   * Finds products related to a specific product by same category, same brand, and collections
   */
  async getRelatedProducts({ productId, limit = 8 }) {
    if (!productId) {
      const error = new Error("Target product ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const targetProduct = await interactionRepository.checkProductActive(productId);
    if (!targetProduct) {
      const error = new Error("Product not found or is currently inactive.");
      error.statusCode = 404;
      throw error;
    }

    const targetLimit = Math.max(
      1,
      Math.min(config.limits.maxRelated, parseInt(limit, 10) || config.limits.defaultRelated)
    );

    const relatedRows = await recommendationRepository.getRelatedProducts({
      productId: targetProduct.id,
      categoryId: targetProduct.category_id,
      brandId: targetProduct.brand_id,
      limit: targetLimit,
    });

    return {
      success: true,
      data: relatedRows.map((r) => this.formatProduct(r)),
      targetProductId: targetProduct.id,
    };
  }
}

module.exports = new RecommendationService();

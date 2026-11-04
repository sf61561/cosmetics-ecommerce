/**
 * RupKotha Recommendation Engine — Configuration
 * Configurable weights, affinities, decay parameters, and safety limits.
 */
module.exports = {
  // Interaction event base weights
  weights: {
    PURCHASE: 5,
    ADD_TO_CART: 4,
    WISHLIST: 3,
    VIEW: 1,
  },

  // Category, brand, and collection affinity multipliers
  affinity: {
    sameCategory: 3.0,
    sameBrand: 2.0,
    sameCollection: 1.0,
  },

  // Time decay configuration (Exponential Half-Life)
  // Score = baseWeight * (0.5 ^ (ageInDays / halfLifeDays))
  decay: {
    halfLifeDays: 14,      // Interactions lose 50% score every 14 days
    maxAgeDays: 60,        // Ignore interactions older than 60 days
    minDecayFactor: 0.05,  // Floor decay factor so old interactions still register a small signal
  },

  // Anti-gaming & repeated interaction caps
  limits: {
    maxCountedViewsPerProduct: 5, // Cap repeated views so spam-clicking doesn't distort recommendations
    debounceWindowSeconds: 15,    // Duplicate interaction within 15 seconds is debounced
    defaultRecommendations: 12,
    maxRecommendations: 24,
    defaultRelated: 8,
    maxRelated: 16,
  },

  // Fallback priorities: 'personalized' -> 'category_brand_affinity' -> 'curated_picks' -> 'popular' -> 'recent'
  fallbackPriorities: [
    "personalized",
    "category_brand_affinity",
    "curated_picks",
    "popular",
    "recent",
  ],
};


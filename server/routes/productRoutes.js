const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const recommendationController = require("../controllers/recommendationController");
const reviewController = require("../controllers/reviewController");
const optionalAuth = require("../middlewares/optionalAuth");
const { attachPreviewContext } = require("../middlewares/previewMiddleware");

// Public category list
router.get("/categories/list", (req, res, next) => productController.getCategories(req, res, next));

// Public products catalog (preview draft-aware when verified)
router.get("/", optionalAuth, attachPreviewContext, (req, res, next) => productController.list(req, res, next));

// Public new arrivals (strictly before /:slug to prevent route shadowing)
router.get("/new-arrivals", optionalAuth, attachPreviewContext, (req, res, next) =>
  productController.getNewArrivals(req, res, next)
);

// GET /api/products/:id/reviews — Public approved reviews for a product
router.get("/:id/reviews", (req, res, next) =>
  reviewController.getPublicProductReviews(req, res, next)
);

// GET /api/products/:id/related — Related products (Same category, brand, collection)
router.get("/:id/related", optionalAuth, (req, res, next) =>
  recommendationController.getRelated(req, res, next)
);

// Public single product by slug (preview draft-aware when verified)
router.get("/:slug", optionalAuth, attachPreviewContext, (req, res, next) => productController.getBySlug(req, res, next));

module.exports = router;


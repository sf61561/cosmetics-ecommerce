const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const recommendationController = require("../controllers/recommendationController");
const reviewController = require("../controllers/reviewController");
const optionalAuth = require("../middlewares/optionalAuth");

// Public category list
router.get("/categories/list", (req, res, next) => productController.getCategories(req, res, next));

// Public products catalog
router.get("/", (req, res, next) => productController.list(req, res, next));

// Public new arrivals (strictly before /:slug to prevent route shadowing)
router.get("/new-arrivals", (req, res, next) =>
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

// Public single product by slug
router.get("/:slug", (req, res, next) => productController.getBySlug(req, res, next));

module.exports = router;


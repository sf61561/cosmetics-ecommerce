const express = require("express");
const searchController = require("../controllers/searchController");
const { searchLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Apply rate limiting to all search endpoints
router.use(searchLimiter);

// GET /api/search/suggest?q=... - Lightweight fast autocomplete
router.get("/suggest", (req, res, next) => searchController.getSuggestions(req, res, next));

// GET /api/search?q=... - Full search with filters, facets, and sorting
router.get("/", (req, res, next) => searchController.search(req, res, next));

module.exports = router;


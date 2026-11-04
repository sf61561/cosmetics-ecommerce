const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");
const optionalAuth = require("../middlewares/optionalAuth");

// GET /api/recommendations?limit=12 — Personalized recommendations
router.get("/", optionalAuth, (req, res, next) =>
  recommendationController.getRecommendations(req, res, next)
);

module.exports = router;


const express = require("express");
const router = express.Router();
const interactionController = require("../controllers/interactionController");
const optionalAuth = require("../middlewares/optionalAuth");
const { interactionLimiter } = require("../middlewares/rateLimiter");

// POST /api/interactions — Record customer interactions (VIEW, ADD_TO_CART, WISHLIST)
router.post(
  "/",
  optionalAuth,
  interactionLimiter,
  (req, res, next) => interactionController.record(req, res, next)
);

module.exports = router;


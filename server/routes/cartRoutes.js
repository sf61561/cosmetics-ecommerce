const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const optionalAuth = require("../middlewares/optionalAuth");

// All cart endpoints support both authenticated customers and guest sessions
router.use(optionalAuth);

/**
 * GET /api/cart — Retrieve current cart
 */
router.get("/", (req, res, next) => cartController.getCart(req, res, next));

/**
 * POST /api/cart/items — Add item to cart
 */
router.post("/items", (req, res, next) => cartController.addItem(req, res, next));

/**
 * PATCH /api/cart/items/:id — Update quantity of a cart item
 */
router.patch("/items/:id", (req, res, next) => cartController.updateQuantity(req, res, next));

/**
 * DELETE /api/cart/items/:id — Remove item from cart
 */
router.delete("/items/:id", (req, res, next) => cartController.removeItem(req, res, next));

/**
 * DELETE /api/cart — Clear entire cart
 */
router.delete("/", (req, res, next) => cartController.clearCart(req, res, next));

module.exports = router;


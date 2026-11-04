const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const wishlistController = require("../controllers/wishlistController");

const router = express.Router();

// All wishlist routes require customer authentication
router.use(authenticate);

// GET /api/wishlist - Get paginated wishlist with live stock and pricing
router.get("/", (req, res, next) => wishlistController.getWishlist(req, res, next));

// GET /api/wishlist/ids - Lightweight array of wishlisted product IDs
router.get("/ids", (req, res, next) => wishlistController.getWishlistIds(req, res, next));

// POST /api/wishlist - Add item
router.post("/", (req, res, next) => wishlistController.addItem(req, res, next));

// POST /api/wishlist/toggle - Toggle item (add if missing, remove if present)
router.post("/toggle", (req, res, next) => wishlistController.toggleItem(req, res, next));

// POST /api/wishlist/merge - Merge guest wishlist on login
router.post("/merge", (req, res, next) => wishlistController.mergeGuestWishlist(req, res, next));

// POST /api/wishlist/:productId/move-to-cart - Move item to shopping bag
router.post("/:productId/move-to-cart", (req, res, next) => wishlistController.moveToCart(req, res, next));

// DELETE /api/wishlist/:productId - Remove item
router.delete("/:productId", (req, res, next) => wishlistController.removeItem(req, res, next));

// DELETE /api/wishlist - Clear entire wishlist
router.delete("/", (req, res, next) => wishlistController.clearWishlist(req, res, next));

module.exports = router;


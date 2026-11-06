const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const orderController = require("../controllers/orderController");

const router = express.Router();

// Public Order Tracking (no login required)
router.get("/track", (req, res, next) => orderController.track(req, res, next));
router.get("/track/:code", (req, res, next) => orderController.track(req, res, next));

router.get("/", authenticate, (req, res, next) => orderController.list(req, res, next));
router.post("/", authenticate, (req, res, next) => orderController.create(req, res, next));
router.get("/:id", authenticate, (req, res, next) => orderController.getById(req, res, next));
router.patch("/:id/cancel", authenticate, (req, res, next) => orderController.cancel(req, res, next));
router.post("/:id/cancel", authenticate, (req, res, next) => orderController.cancel(req, res, next));

module.exports = router;

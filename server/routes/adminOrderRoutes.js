const express = require("express");
const controller = require("../controllers/adminOrderController");
const router = express.Router();

router.get("/", (req, res, next) => controller.list(req, res, next));
router.get("/:id", (req, res, next) => controller.getById(req, res, next));
router.patch("/:id/status", (req, res, next) => controller.updateStatus(req, res, next));
router.patch("/:id/shipping", (req, res, next) => controller.updateShipping(req, res, next));

module.exports = router;

const express = require("express");
const controller = require("../controllers/adminOrderController");
const router = express.Router();

router.get("/", (req, res, next) => controller.list(req, res, next));
router.get("/cost-headers", (req, res, next) => controller.getCostHeaders(req, res, next));
router.get("/:id", (req, res, next) => controller.getById(req, res, next));
router.patch("/:id/status", (req, res, next) => controller.updateStatus(req, res, next));
router.patch("/:id/shipping", (req, res, next) => controller.updateShipping(req, res, next));
router.patch("/:id/item-costs", (req, res, next) => controller.updateItemCosts(req, res, next));
router.post("/:id/other-costs", (req, res, next) => controller.addOtherCost(req, res, next));
router.patch("/:id/other-costs/:costId", (req, res, next) => controller.updateOtherCost(req, res, next));
router.delete("/:id/other-costs/:costId", (req, res, next) => controller.deleteOtherCost(req, res, next));

module.exports = router;

const express = require("express");
const controller = require("../controllers/adminOrderController");
const { requirePermission } = require("../middlewares/permissionMiddleware");
const router = express.Router();

// Order view
router.get("/", requirePermission("orders.view"), (req, res, next) => controller.list(req, res, next));
router.get("/cost-headers", requirePermission(["costs.view", "other_costs.view"], { mode: "any" }), (req, res, next) => controller.getCostHeaders(req, res, next));
router.get("/:id", requirePermission("orders.view"), (req, res, next) => controller.getById(req, res, next));

// Order status & shipping
router.patch("/:id/status", requirePermission("orders.status"), (req, res, next) => controller.updateStatus(req, res, next));
router.patch("/:id/shipping", requirePermission("orders.edit"), (req, res, next) => controller.updateShipping(req, res, next));

// Financial costs editing
router.patch("/:id/item-costs", requirePermission("costs.edit"), (req, res, next) => controller.updateItemCosts(req, res, next));
router.post("/:id/other-costs", requirePermission("other_costs.add"), (req, res, next) => controller.addOtherCost(req, res, next));
router.patch("/:id/other-costs/:costId", requirePermission("other_costs.edit"), (req, res, next) => controller.updateOtherCost(req, res, next));
router.delete("/:id/other-costs/:costId", requirePermission("other_costs.delete"), (req, res, next) => controller.deleteOtherCost(req, res, next));

module.exports = router;

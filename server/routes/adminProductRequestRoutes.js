const express = require("express");
const router = express.Router();
const productRequestController = require("../controllers/productRequestController");
const { requirePermission } = require("../middlewares/permissionMiddleware");

// Admin endpoints
router.get("/metrics", requirePermission("products.view"), productRequestController.getMetrics);
router.get("/", requirePermission("products.view"), productRequestController.listRequests);
router.get("/:id", requirePermission("products.view"), productRequestController.getRequest);
router.patch("/:id", requirePermission("products.edit"), productRequestController.updateRequest);
router.delete("/:id", requirePermission("products.edit"), productRequestController.deleteRequest);

module.exports = router;

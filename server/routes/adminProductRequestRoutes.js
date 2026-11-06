const express = require("express");
const router = express.Router();
const productRequestController = require("../controllers/productRequestController");

// Admin endpoints (all protected by authenticate + requireRole('ADMIN') in adminRoutes)
router.get("/metrics", productRequestController.getMetrics);
router.get("/", productRequestController.listRequests);
router.get("/:id", productRequestController.getRequest);
router.patch("/:id", productRequestController.updateRequest);
router.delete("/:id", productRequestController.deleteRequest);

module.exports = router;


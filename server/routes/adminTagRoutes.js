const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");
const { requirePermission } = require("../middlewares/permissionMiddleware");

// Admin tag management routes
router.get("/", requirePermission("products.view"), tagController.listTags);
router.get("/:id", requirePermission("products.view"), tagController.getTag);
router.post("/", requirePermission("products.edit"), tagController.createTag);
router.patch("/:id", requirePermission("products.edit"), tagController.updateTag);
router.delete("/:id", requirePermission("products.edit"), tagController.deleteTag);

module.exports = router;

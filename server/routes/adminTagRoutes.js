const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");

// Admin tag management routes
router.post("/", tagController.createTag);
router.get("/", tagController.listTags);
router.get("/:id", tagController.getTag);
router.patch("/:id", tagController.updateTag);
router.delete("/:id", tagController.deleteTag);

module.exports = router;


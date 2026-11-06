const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");

// Public tag routes
router.get("/", tagController.listTags);
router.get("/:id", tagController.getTag);

module.exports = router;


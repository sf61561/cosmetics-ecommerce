const express = require("express");
const router = express.Router();
const optionalAuth = require("../middlewares/optionalAuth");
const productRequestController = require("../controllers/productRequestController");

// Public product request submission (with optional auth session detection)
router.post("/", optionalAuth, productRequestController.createRequest);

module.exports = router;


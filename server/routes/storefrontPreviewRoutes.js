const express = require("express");
const router = express.Router();
const optionalAuth = require("../middlewares/optionalAuth");
const storefrontPreviewController = require("../controllers/storefrontPreviewController");

// Public-safe storefront preview capability check (never honors preview flag without verified admin session + permission)
router.get("/session", optionalAuth, (req, res, next) =>
  storefrontPreviewController.getSession(req, res, next)
);

module.exports = router;

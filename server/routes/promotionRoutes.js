const express = require("express");
const optionalAuth = require("../middlewares/optionalAuth");
const promotionController = require("../controllers/promotionController");

const router = express.Router();

router.get("/delivery-options", (req, res, next) =>
  promotionController.listDeliveryRules(req, res, next)
);

router.post("/calculate-cart", optionalAuth, (req, res, next) =>
  promotionController.calculateCart(req, res, next)
);

module.exports = router;

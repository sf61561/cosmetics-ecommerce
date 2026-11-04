const express = require("express");
const promotionController = require("../controllers/promotionController");

const router = express.Router();

router.get("/delivery-settings", (req, res, next) =>
  promotionController.listDeliveryRules(req, res, next)
);
router.put("/delivery-settings", (req, res, next) =>
  promotionController.updateDeliverySettings(req, res, next)
);
router.post("/delivery-settings", (req, res, next) =>
  promotionController.saveDeliveryRule(req, res, next)
);
router.patch("/delivery-settings/:id", (req, res, next) =>
  promotionController.saveDeliveryRule(req, res, next)
);
router.get("/coupons", (req, res, next) => promotionController.listCoupons(req, res, next));
router.get("/coupons/:id", (req, res, next) => promotionController.getCoupon(req, res, next));
router.post("/coupons", (req, res, next) => promotionController.saveCoupon(req, res, next));
router.patch("/coupons/:id", (req, res, next) => promotionController.saveCoupon(req, res, next));
router.patch("/coupons/:id/status", (req, res, next) =>
  promotionController.updateCouponStatus(req, res, next)
);

module.exports = router;

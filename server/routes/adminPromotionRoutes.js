const express = require("express");
const promotionController = require("../controllers/promotionController");
const { requirePermission } = require("../middlewares/permissionMiddleware");

const router = express.Router();

// Store settings view
router.get("/delivery-settings", requirePermission("settings.store_view"), (req, res, next) =>
  promotionController.listDeliveryRules(req, res, next)
);
router.get("/coupons", requirePermission("settings.store_view"), (req, res, next) =>
  promotionController.listCoupons(req, res, next)
);
router.get("/coupons/:id", requirePermission("settings.store_view"), (req, res, next) =>
  promotionController.getCoupon(req, res, next)
);

// Store settings edit
router.put("/delivery-settings", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.updateDeliverySettings(req, res, next)
);
router.post("/delivery-settings", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.saveDeliveryRule(req, res, next)
);
router.patch("/delivery-settings/:id", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.saveDeliveryRule(req, res, next)
);
router.post("/coupons", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.saveCoupon(req, res, next)
);
router.patch("/coupons/:id", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.saveCoupon(req, res, next)
);
router.patch("/coupons/:id/status", requirePermission("settings.store_edit"), (req, res, next) =>
  promotionController.updateCouponStatus(req, res, next)
);

module.exports = router;

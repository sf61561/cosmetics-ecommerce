const promotionService = require("../services/promotionService");

class PromotionController {
  async listDeliveryRules(req, res, next) {
    try {
      res.json({ success: true, data: await promotionService.listDeliveryRules() });
    } catch (error) {
      next(error);
    }
  }

  async saveDeliveryRule(req, res, next) {
    try {
      const data = await promotionService.saveDeliveryRule(req.body, req.params.id || null, req.user, req.auditRequest);
      res.status(req.params.id ? 200 : 201).json({ success: true, message: "Delivery charge saved.", data });
    } catch (error) {
      next(error);
    }
  }

  async updateDeliverySettings(req, res, next) {
    try {
      const data = await promotionService.updateDeliverySettings(req.body, req.user, req.auditRequest);
      res.json({ success: true, message: "Delivery charges updated successfully.", data });
    } catch (error) {
      next(error);
    }
  }

  async listCoupons(req, res, next) {
    try {
      const result = await promotionService.listCoupons(req.query);
      res.json({ success: true, data: result.coupons, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getCoupon(req, res, next) {
    try {
      const coupon = await promotionService.getCoupon(req.params.id);
      if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
      res.json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  }

  async saveCoupon(req, res, next) {
    try {
      const data = await promotionService.saveCoupon(req.body, req.params.id || null, req.user, req.auditRequest);
      res.status(req.params.id ? 200 : 201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateCouponStatus(req, res, next) {
    try {
      res.json({
        success: true,
        data: await promotionService.updateCouponStatus(req.params.id, req.body.isActive, req.user, req.auditRequest),
      });
    } catch (error) {
      next(error);
    }
  }

  async calculateCart(req, res, next) {
    try {
      const data = await promotionService.calculateCartTotal({
        userId: req.user?.id || null,
        sessionId: req.sessionId,
        zone: req.body.zone,
        code: req.body.code,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PromotionController();

const orderService = require("../services/orderService");

class OrderController {
  async list(req, res, next) {
    try {
      const data = await orderService.listCustomerOrders(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await orderService.createOrder({
        userId: req.user.id,
        sessionId: req.sessionId,
        zone: req.body.zone,
        couponCode: req.body.couponCode,
        addressId: req.body.addressId,
        idempotencyKey: req.body.idempotencyKey,
        customerNote: req.body.customerNote || req.body.note,
      }, req.user, req.auditRequest);
      res.status(201).json({ success: true, message: "Order placed successfully.", data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await orderService.getCustomerOrder(req.params.id, req.user.id);
      if (!data) return res.status(404).json({ success: false, message: "Order not found." });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const note = req.body?.note || req.body?.reason || "Cancelled by customer";
      const data = await orderService.cancelCustomerOrder(req.params.id, req.user.id, note, req.user, req.auditRequest);
      res.json({ success: true, message: "Order has been cancelled successfully.", data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

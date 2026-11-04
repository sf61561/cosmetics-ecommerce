const service = require("../services/adminOrderService");

module.exports = {
  async list(req, res, next) {
    try {
      res.json({ success: true, data: await service.list(req.query) });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await service.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: "Order not found." });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, note, courierName, trackingNumber, adminNote } = req.body;
      const data = await service.updateStatus(
        req.params.id,
        status,
        { note, courierName, trackingNumber, adminNote },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Order status updated successfully.", data });
    } catch (error) {
      next(error);
    }
  },

  async updateShipping(req, res, next) {
    try {
      const { courierName, trackingNumber, adminNote } = req.body;
      const data = await service.updateShipping(
        req.params.id,
        { courierName, trackingNumber, adminNote },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Shipping details updated successfully.", data });
    } catch (error) {
      next(error);
    }
  },
};

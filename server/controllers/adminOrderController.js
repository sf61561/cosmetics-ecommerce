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

  async getCostHeaders(req, res, next) {
    try {
      const data = await service.getCostHeaders();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async updateItemCosts(req, res, next) {
    try {
      const { itemCosts } = req.body;
      if (!Array.isArray(itemCosts)) {
        return res.status(400).json({ success: false, message: "itemCosts must be an array." });
      }
      const data = await service.updateItemCosts(
        req.params.id,
        itemCosts,
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Item costs updated successfully.", data });
    } catch (error) {
      next(error);
    }
  },

  async addOtherCost(req, res, next) {
    try {
      const { header, amount, note } = req.body;
      const data = await service.addOtherCost(
        req.params.id,
        { header, amount, note },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Other cost added successfully.", data });
    } catch (error) {
      next(error);
    }
  },

  async updateOtherCost(req, res, next) {
    try {
      const { header, amount, note } = req.body;
      const data = await service.updateOtherCost(
        req.params.costId,
        req.params.id,
        { header, amount, note },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Other cost updated successfully.", data });
    } catch (error) {
      next(error);
    }
  },

  async deleteOtherCost(req, res, next) {
    try {
      const data = await service.deleteOtherCost(
        req.params.costId,
        req.params.id,
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Other cost deleted successfully.", data });
    } catch (error) {
      next(error);
    }
  },
};

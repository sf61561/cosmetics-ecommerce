const repository = require("../repositories/adminOrderRepository");
const orderService = require("./orderService");

const adminOrderService = {
  async list(params) {
    const [result, summary] = await Promise.all([repository.list(params), repository.summary()]);
    return {
      ...result,
      summary: Object.fromEntries(Object.entries(summary || {}).map(([key, value]) => [key, Number(value)])),
    };
  },

  getById(id) {
    return repository.getById(id);
  },

  async updateStatus(id, status, { note = "", courierName = "", trackingNumber = "", adminNote = "" } = {}, actor, request) {
    return orderService.updateOrderStatus(id, status, { note, courierName, trackingNumber, adminNote }, actor, request);
  },

  async updateShipping(id, { courierName = "", trackingNumber = "", adminNote = "" } = {}, actor, request) {
    return orderService.updateOrderShipping(id, { courierName, trackingNumber, adminNote }, actor, request);
  },
};

module.exports = adminOrderService;

const repository = require("../repositories/adminOrderRepository");
const orderService = require("./orderService");
const auditService = require("./auditService");

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

  getCostHeaders() {
    return repository.getCostHeaders();
  },

  async updateItemCosts(orderId, itemCosts = [], actor, request) {
    const order = await repository.getById(orderId);
    if (!order) throw new Error("Order not found.");

    const previousValues = {
      items: order.items.map((i) => ({ id: i.id, sku: i.sku, costPrice: i.costPrice })),
    };

    await repository.updateItemCosts(orderId, itemCosts, actor?.id);
    const updatedOrder = await repository.getById(orderId);

    try {
      await auditService.record(
        {
          action: "ORDER_COSTS_UPDATED",
          entityType: "ORDER",
          entityId: orderId,
          actor,
          previousValues,
          newValues: {
            items: updatedOrder.items.map((i) => ({ id: i.id, sku: i.sku, costPrice: i.costPrice })),
            profitSummary: updatedOrder.profitSummary,
          },
          metadata: { itemCount: itemCosts.length },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record cost update audit log:", auditErr.message);
    }

    return updatedOrder;
  },

  async addOtherCost(orderId, { header, amount, note } = {}, actor, request) {
    if (!header || !String(header).trim()) {
      throw new Error("Cost header is required.");
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("Cost amount must be greater than zero.");
    }

    const order = await repository.getById(orderId);
    if (!order) throw new Error("Order not found.");

    const costRow = await repository.addOtherCost(orderId, { header, amount: numAmount, note }, actor?.id);
    const updatedOrder = await repository.getById(orderId);

    try {
      await auditService.record(
        {
          action: "ORDER_OTHER_COST_ADDED",
          entityType: "ORDER",
          entityId: orderId,
          actor,
          newValues: {
            costId: costRow.id,
            header: costRow.header,
            amount: Number(costRow.amount),
            note: costRow.note,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record add other cost audit log:", auditErr.message);
    }

    return updatedOrder;
  },

  async updateOtherCost(costId, orderId, payload = {}, actor, request) {
    const order = await repository.getById(orderId);
    if (!order) throw new Error("Order not found.");

    const existingCost = order.otherCosts?.find((c) => c.id === costId);
    if (!existingCost) throw new Error("Other cost record not found.");

    if (payload.header !== undefined && !String(payload.header).trim()) {
      throw new Error("Cost header cannot be empty.");
    }
    if (payload.amount !== undefined) {
      const num = Number(payload.amount);
      if (isNaN(num) || num <= 0) throw new Error("Cost amount must be greater than zero.");
    }

    const updatedRow = await repository.updateOtherCost(costId, orderId, payload, actor?.id);
    const updatedOrder = await repository.getById(orderId);

    try {
      await auditService.record(
        {
          action: "ORDER_OTHER_COST_UPDATED",
          entityType: "ORDER",
          entityId: orderId,
          actor,
          previousValues: {
            header: existingCost.header,
            amount: existingCost.amount,
            note: existingCost.note,
          },
          newValues: {
            header: updatedRow.header,
            amount: Number(updatedRow.amount),
            note: updatedRow.note,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record update other cost audit log:", auditErr.message);
    }

    return updatedOrder;
  },

  async deleteOtherCost(costId, orderId, actor, request) {
    const order = await repository.getById(orderId);
    if (!order) throw new Error("Order not found.");

    const existingCost = order.otherCosts?.find((c) => c.id === costId);
    if (!existingCost) throw new Error("Other cost record not found.");

    await repository.deleteOtherCost(costId, orderId);
    const updatedOrder = await repository.getById(orderId);

    try {
      await auditService.record(
        {
          action: "ORDER_OTHER_COST_DELETED",
          entityType: "ORDER",
          entityId: orderId,
          actor,
          previousValues: {
            costId: existingCost.id,
            header: existingCost.header,
            amount: existingCost.amount,
            note: existingCost.note,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record delete other cost audit log:", auditErr.message);
    }

    return updatedOrder;
  },
};

module.exports = adminOrderService;

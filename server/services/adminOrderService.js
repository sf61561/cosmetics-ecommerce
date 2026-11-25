const repository = require("../repositories/adminOrderRepository");
const orderService = require("./orderService");
const auditService = require("./auditService");
const superadminService = require("./superadminService");

function stripOrderFinancials(order, userPermissions, isSuperAdmin) {
  if (!order) return order;
  if (isSuperAdmin) return order;

  const canViewCosts = userPermissions.includes("costs.view");
  const canViewOtherCosts = userPermissions.includes("other_costs.view");
  const canViewProfit = userPermissions.includes("profit.view");

  const sanitized = { ...order };

  if (!canViewCosts) {
    if (Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.map((item) => {
        const { costPrice, costEnteredAt, costEnteredByName, ...rest } = item;
        return {
          ...rest,
          costPrice: null,
          costEnteredAt: null,
          costEnteredByName: null,
          profit: canViewProfit ? null : undefined,
        };
      });
    }
  }

  if (!canViewOtherCosts) {
    sanitized.otherCosts = [];
  }

  if (!canViewProfit) {
    delete sanitized.profitSummary;
    if (Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.map((item) => {
        const { profit, ...rest } = item;
        return rest;
      });
    }
  } else if (!canViewCosts || !canViewOtherCosts) {
    if (sanitized.profitSummary) {
      sanitized.profitSummary = { ...sanitized.profitSummary };
      if (!canViewCosts) {
        sanitized.profitSummary.totalItemCost = null;
        sanitized.profitSummary.itemGrossProfit = null;
      }
      if (!canViewOtherCosts) {
        sanitized.profitSummary.totalOtherCost = null;
      }
    }
  }

  return sanitized;
}

const adminOrderService = {
  async list(params, user) {
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const userPermissions = !isSuperAdmin && user?.id ? await superadminService.getUserPermissions(user.id) : [];
    const canViewCosts = isSuperAdmin || userPermissions.includes("costs.view");

    const [result, summary] = await Promise.all([repository.list(params), repository.summary()]);

    let sanitizedOrders = result.orders;
    if (!canViewCosts) {
      sanitizedOrders = result.orders.map((o) => {
        const { hasPendingCosts, pendingCostCount, ...rest } = o;
        return { ...rest, hasPendingCosts: false, pendingCostCount: 0 };
      });
    }

    const sanitizedSummary = Object.fromEntries(
      Object.entries(summary || {}).map(([key, value]) => [key, Number(value)])
    );
    if (!canViewCosts) {
      delete sanitizedSummary.cost_pending;
    }

    return {
      ...result,
      orders: sanitizedOrders,
      summary: sanitizedSummary,
    };
  },

  async getById(id, user) {
    const order = await repository.getById(id);
    if (!order) return null;
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const userPermissions = !isSuperAdmin && user?.id ? await superadminService.getUserPermissions(user.id) : [];
    return stripOrderFinancials(order, userPermissions, isSuperAdmin);
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

const repository = require("../repositories/returnRepository");
const auditService = require("./auditService");

const returnService = {
  async getOrderEligibility(orderId, customerId) {
    const data = await repository.getOrderForReturn(orderId, customerId);
    if (!data) throw new Error("Order not found or not eligible for return.");
    return data;
  },

  async createReturn(payload, actor, request) {
    const returnRecord = await repository.createReturn({
      ...payload,
      customerId: actor.id,
    });

    try {
      await auditService.record(
        {
          action: "RETURN_REQUESTED",
          entityType: "RETURN",
          entityId: returnRecord.id,
          actor,
          newValues: {
            returnNumber: returnRecord.return_number,
            orderId: returnRecord.order_id,
            reason: returnRecord.reason,
            refundAmount: Number(returnRecord.refund_amount),
            refundMethod: returnRecord.refund_method,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record return requested audit log:", auditErr.message);
    }

    return returnRecord;
  },

  listByCustomer(customerId, query) {
    return repository.listByCustomer(customerId, query);
  },

  async getByIdForCustomer(returnId, customerId) {
    const data = await repository.getByIdForCustomer(returnId, customerId);
    if (!data) throw new Error("Return request not found.");
    return data;
  },

  async addCustomerPhotos(returnId, customerId, images = [], actor, request) {
    const success = await repository.addCustomerPhotos(returnId, customerId, images);

    try {
      await auditService.record(
        {
          action: "RETURN_STATUS_CHANGED",
          entityType: "RETURN",
          entityId: returnId,
          actor,
          newValues: {
            status: "REQUESTED",
            imageCount: images.length,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record customer photo upload audit log:", auditErr.message);
    }

    return success;
  },
};

module.exports = returnService;

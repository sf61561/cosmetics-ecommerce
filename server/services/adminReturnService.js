const repository = require("../repositories/adminReturnRepository");
const auditService = require("./auditService");

const adminReturnService = {
  async list(params) {
    const [result, summary] = await Promise.all([repository.list(params), repository.summary()]);
    return {
      ...result,
      summary: Object.fromEntries(Object.entries(summary || {}).map(([k, v]) => [k, Number(v)])),
    };
  },

  async getById(id) {
    const data = await repository.getById(id);
    if (!data) throw new Error("Return request not found.");
    return data;
  },

  async updateStatus(id, newStatus, payload = {}, actor, request) {
    const existing = await repository.getById(id);
    if (!existing) throw new Error("Return request not found.");

    const updated = await repository.updateStatus(id, newStatus, payload, actor?.id);

    const auditAction = newStatus === "APPROVED"
      ? "RETURN_APPROVED"
      : newStatus === "REJECTED"
      ? "RETURN_REJECTED"
      : "RETURN_STATUS_CHANGED";

    try {
      await auditService.record(
        {
          action: auditAction,
          entityType: "RETURN",
          entityId: id,
          actor,
          previousValues: { status: existing.status },
          newValues: { status: newStatus, note: payload.note, rejectionReason: payload.rejectionReason },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record return status audit log:", auditErr.message);
    }

    return updated;
  },

  async requestPhotos(id, prompt = "", actor, request) {
    if (!prompt || !prompt.trim()) {
      throw new Error("Prompt is required when requesting additional photos.");
    }

    const updated = await repository.updateStatus(
      id,
      "INFO_NEEDED",
      { note: "Admin requested additional photos", infoNeededPrompt: prompt.trim() },
      actor?.id
    );

    try {
      await auditService.record(
        {
          action: "RETURN_PHOTOS_REQUESTED",
          entityType: "RETURN",
          entityId: id,
          actor,
          newValues: { status: "INFO_NEEDED", prompt: prompt.trim() },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record request photos audit log:", auditErr.message);
    }

    return updated;
  },

  async saveInspection(id, payload = {}, actor, request) {
    const updated = await repository.saveInspection(id, payload, actor?.id);

    try {
      await auditService.record(
        {
          action: "RETURN_INSPECTED",
          entityType: "RETURN",
          entityId: id,
          actor,
          newValues: {
            itemConditions: payload.itemConditions,
            adminNote: payload.adminNote,
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record inspection audit log:", auditErr.message);
    }

    return updated;
  },

  async processRefund(id, payload = {}, actor, request) {
    const updated = await repository.processRefund(id, payload, actor?.id);

    try {
      await auditService.record(
        {
          action: "RETURN_REFUNDED",
          entityType: "RETURN",
          entityId: id,
          actor,
          newValues: {
            refundMethod: payload.refundMethod,
            refundAccountDetails: payload.refundAccountDetails,
            returnShippingFee: payload.returnShippingFee,
            returnShippingPayer: payload.returnShippingPayer,
            status: "COMPLETED",
          },
        },
        { request }
      );
    } catch (auditErr) {
      console.error("Failed to record refund audit log:", auditErr.message);
    }

    return updated;
  },
};

module.exports = adminReturnService;

const auditRepository = require("../repositories/auditRepository");

const adminAuditController = {
  async list(req, res, next) {
    try {
      const result = await auditRepository.list(req.query);
      res.json({ success: true, data: result.logs, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      const log = await auditRepository.getById(req.params.id);
      if (!log) return res.status(404).json({ success: false, message: "Audit log not found." });
      return res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminAuditController;

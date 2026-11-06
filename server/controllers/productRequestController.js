const productRequestService = require("../services/productRequestService");

const productRequestController = {
  /**
   * Public submission of a product request
   */
  async createRequest(req, res, next) {
    try {
      const {
        productName,
        variantText,
        customerPhone,
        customerEmail,
        customerName,
        sourceUrl,
        notes,
      } = req.body || {};

      const userId = req.user?.id || null;
      const resolvedName = customerName || req.user?.name || null;
      const resolvedEmail = customerEmail || (req.user?.email && !customerEmail ? req.user.email : customerEmail);
      const resolvedPhone = customerPhone || req.user?.phone || null;

      const data = await productRequestService.submitRequest({
        userId,
        productName,
        variantText,
        customerPhone: resolvedPhone,
        customerEmail: resolvedEmail,
        customerName: resolvedName,
        sourceUrl,
        notes,
      });

      res.status(201).json({
        success: true,
        message: "Your product request has been submitted successfully. We will notify you once available!",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: List paginated requests
   */
  async listRequests(req, res, next) {
    try {
      const { search, status, page, limit, sortBy, sortOrder } = req.query;
      const data = await productRequestService.listRequests({
        search,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: Get single request by ID
   */
  async getRequest(req, res, next) {
    try {
      const data = await productRequestService.getRequestById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: Update request status and admin notes
   */
  async updateRequest(req, res, next) {
    try {
      const { status, adminNotes } = req.body || {};
      const data = await productRequestService.updateRequest(req.params.id, {
        status,
        adminNotes,
      });
      res.status(200).json({
        success: true,
        message: "Product request updated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: Delete request
   */
  async deleteRequest(req, res, next) {
    try {
      const result = await productRequestService.deleteRequest(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Admin: Get status metrics
   */
  async getMetrics(req, res, next) {
    try {
      const data = await productRequestService.getMetrics();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = productRequestController;


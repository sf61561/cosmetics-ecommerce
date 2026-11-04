const customerService = require("../services/customerService");

class AdminCustomerController {
  /**
   * GET /api/admin/customers
   * List paginated customers with search, filters, and KPI summary
   */
  async list(req, res, next) {
    try {
      const {
        search = "",
        status = "all",
        hasOrders = "all",
        startDate,
        endDate,
        sortBy = "created_at",
        sortOrder = "DESC",
        page = 1,
        limit = 10,
      } = req.query;

      const result = await customerService.getCustomers({
        search,
        status,
        hasOrders,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: result.customers,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/:id
   * Get customer details by ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomerById(id);
      return res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/customers/:id
   * Update permitted profile fields for customer
   */
  async updateProfile(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await customerService.updateCustomerProfile(id, req.body, req.user, req.auditRequest);
      return res.status(200).json({
        success: true,
        message: "Customer profile updated successfully.",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/customers/:id/status
   * Block or unblock customer account
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await customerService.updateCustomerStatus(id, status, req.user, req.auditRequest);
      return res.status(200).json({
        success: true,
        message: `Customer account has been ${status === "BLOCKED" ? "blocked" : "unblocked"} successfully.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/:id/orders
   * Get customer order history
   */
  async getOrders(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const result = await customerService.getCustomerOrders(id, { page, limit });
      return res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/:id/wishlist
   * Get customer wishlist items
   */
  async getWishlist(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 12 } = req.query;
      const result = await customerService.getCustomerWishlist(id, { page, limit });
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/:id/activity
   * Get customer recent interaction activity
   */
  async getActivity(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;
      const activity = await customerService.getCustomerActivity(id, { limit });
      return res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/:id/addresses
   * Get customer saved delivery addresses
   */
  async getAddresses(req, res, next) {
    try {
      const { id } = req.params;
      const addresses = await customerService.getCustomerAddresses(id);
      return res.status(200).json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/customers/export
   * Export filtered customer records as CSV
   */
  async exportCsv(req, res, next) {
    try {
      const { search, status, hasOrders, startDate, endDate } = req.query;
      const csv = await customerService.generateCustomerCsv({
        search,
        status,
        hasOrders,
        startDate,
        endDate,
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="eloura-customers-${Date.now()}.csv"`
      );
      return res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminCustomerController();


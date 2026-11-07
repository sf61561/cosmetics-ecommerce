const productRequestRepository = require("../repositories/productRequestRepository");

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "FULFILLED", "REJECTED"];

function isEmail(val) {
  if (!val || typeof val !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isPhone(val) {
  if (!val || typeof val !== "string") return false;
  const cleaned = val.replace(/[\s\-()]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

const productRequestService = {
  /**
   * Submit a new customer product request
   */
  async submitRequest({
    userId = null,
    productName,
    variantText = null,
    customerPhone,
    customerEmail = null,
    customerName = null,
    sourceUrl = null,
    notes = null,
  }) {
    // Validate product name (Required)
    if (!productName || typeof productName !== "string" || !productName.trim()) {
      const error = new Error("Product name is required.");
      error.statusCode = 400;
      error.field = "productName";
      throw error;
    }
    if (productName.trim().length > 255) {
      const error = new Error("Product name must be 255 characters or fewer.");
      error.statusCode = 400;
      error.field = "productName";
      throw error;
    }

    // Validate customer phone (Required: "phone is must")
    if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
      const error = new Error("Contact phone number is required.");
      error.statusCode = 400;
      error.field = "customerPhone";
      throw error;
    }
    if (!isPhone(customerPhone)) {
      const error = new Error("Please enter a valid phone number (e.g. 01700000000).");
      error.statusCode = 400;
      error.field = "customerPhone";
      throw error;
    }

    // Validate customer email (Optional: "and email is optional")
    if (customerEmail && customerEmail.trim()) {
      if (/^www\./i.test(customerEmail.trim())) {
        const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
        error.statusCode = 400;
        error.field = "customerEmail";
        throw error;
      }
      if (!isEmail(customerEmail)) {
        const error = new Error("Please enter a valid email address.");
        error.statusCode = 400;
        error.field = "customerEmail";
        throw error;
      }
    }

    // Validate variant text (Optional, max 255)
    if (variantText && typeof variantText === "string" && variantText.trim().length > 255) {
      const error = new Error("Variant description must be 255 characters or fewer.");
      error.statusCode = 400;
      error.field = "variantText";
      throw error;
    }

    return await productRequestRepository.create({
      userId,
      productName,
      variantText,
      customerPhone,
      customerEmail: customerEmail && customerEmail.trim() ? customerEmail.trim() : null,
      customerName,
      sourceUrl,
      notes,
    });
  },

  /**
   * List paginated product requests for admin
   */
  async listRequests(params = {}) {
    return await productRequestRepository.findAll(params);
  },

  /**
   * Get single product request by ID
   */
  async getRequestById(id) {
    if (!id) {
      const error = new Error("Request ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const request = await productRequestRepository.findById(id);
    if (!request) {
      const error = new Error("Product request not found.");
      error.statusCode = 404;
      throw error;
    }
    return request;
  },

  /**
   * Update product request status and notes
   */
  async updateRequest(id, { status, adminNotes }) {
    if (!id) {
      const error = new Error("Request ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const existing = await productRequestRepository.findById(id);
    if (!existing) {
      const error = new Error("Product request not found.");
      error.statusCode = 404;
      throw error;
    }

    if (status) {
      const normalizedStatus = status.toUpperCase();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
        error.statusCode = 400;
        error.field = "status";
        throw error;
      }
    }

    return await productRequestRepository.updateStatus(id, { status, adminNotes });
  },

  /**
   * Delete product request
   */
  async deleteRequest(id) {
    if (!id) {
      const error = new Error("Request ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const deleted = await productRequestRepository.delete(id);
    if (!deleted) {
      const error = new Error("Product request not found or already deleted.");
      error.statusCode = 404;
      throw error;
    }
    return { success: true, message: "Product request deleted successfully." };
  },

  /**
   * Get KPI metrics
   */
  async getMetrics() {
    return await productRequestRepository.getMetrics();
  },
};

module.exports = productRequestService;


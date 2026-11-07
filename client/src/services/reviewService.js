import { API_BASE } from "./apiConfig";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
        ? "Access forbidden."
        : `Request failed with status ${response.status}`);

    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const reviewService = {
  /**
   * Check if logged-in customer is eligible to review a product
   */
  async checkEligibility(productId) {
    const response = await fetch(`${API_BASE}/reviews/eligibility?productId=${productId}`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Submit a new customer review (FormData with files)
   */
  async submitReview(formData) {
    const response = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * Resubmit a rejected review (FormData with files)
   */
  async resubmitReview(reviewId, formData) {
    const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * Get customer's submitted reviews
   */
  async getMyReviews({ page = 1, limit = 20 } = {}) {
    const response = await fetch(`${API_BASE}/reviews/my-reviews?page=${page}&limit=${limit}`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Batch get review status for items in an order
   */
  async getOrderItemsReviewStatus(orderItemIds = []) {
    const response = await fetch(`${API_BASE}/reviews/order-items-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderItemIds }),
    });
    const res = await handleResponse(response);
    return res.data || {};
  },

  /**
   * Get public reviews for Product Details Page
   */
  async getPublicProductReviews(productId, { page = 1, limit = 10, sort = "newest", rating = "", withPhotosOnly = false } = {}) {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (sort) params.append("sort", sort);
    if (rating) params.append("rating", rating.toString());
    if (withPhotosOnly) params.append("withPhotosOnly", "true");

    const response = await fetch(`${API_BASE}/products/${productId}/reviews?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Admin: List reviews with filters
   */
  async getAdminReviews({ page = 1, limit = 15, status = "", rating = "", search = "", dateFrom = "", dateTo = "" } = {}) {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (status && status !== "all") params.append("status", status);
    if (rating && rating !== "all") params.append("rating", rating.toString());
    if (search.trim()) params.append("search", search.trim());
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    const response = await fetch(`${API_BASE}/admin/reviews?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Admin: Metrics (KPI cards)
   */
  async getAdminMetrics() {
    const response = await fetch(`${API_BASE}/admin/reviews/metrics`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Admin: Pending count badge
   */
  async getPendingCount() {
    const response = await fetch(`${API_BASE}/admin/reviews/pending-count`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data?.pendingCount || 0;
  },

  /**
   * Admin: Single review details
   */
  async getAdminReviewById(reviewId) {
    const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
      method: "GET",
      credentials: "include",
    });
    const res = await handleResponse(response);
    return res.data;
  },

  /**
   * Admin: Approve single review
   */
  async approveReview(reviewId) {
    const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}/approve`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse(response);
  },

  /**
   * Admin: Reject single review with reason
   */
  async rejectReview(reviewId, reason) {
    const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Admin: Delete review
   */
  async deleteReview(reviewId) {
    const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse(response);
  },

  /**
   * Admin: Bulk approve reviews
   */
  async bulkApprove(reviewIds = []) {
    const response = await fetch(`${API_BASE}/admin/reviews/bulk-approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reviewIds }),
    });
    return handleResponse(response);
  },
};


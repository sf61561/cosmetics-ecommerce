const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Handle API response and extract JSON or error
 */
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
        ? "Access forbidden. Admin role required."
        : `Request failed with status ${response.status}`);

    const error = new Error(errorMsg);
    error.status = response.status;
    error.field = data?.field || null;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data;
}

export const customerService = {
  /**
   * Fetch paginated customers with filters, search, and KPI summary
   */
  async getCustomers({
    search = "",
    status = "all",
    hasOrders = "all",
    startDate = "",
    endDate = "",
    sortBy = "created_at",
    sortOrder = "DESC",
    page = 1,
    limit = 10,
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (hasOrders && hasOrders !== "all") params.append("hasOrders", hasOrders);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());

    const res = await fetch(`${API_BASE}/api/admin/customers?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Fetch single customer details by ID
   */
  async getCustomerById(id) {
    const res = await fetch(`${API_BASE}/api/admin/customers/${id}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Update permitted customer profile fields (name, phone)
   */
  async updateCustomerProfile(id, data) {
    const res = await fetch(`${API_BASE}/api/admin/customers/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  /**
   * Block or unblock customer account status
   */
  async updateCustomerStatus(id, status) {
    const res = await fetch(`${API_BASE}/api/admin/customers/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  /**
   * Fetch customer order history
   */
  async getCustomerOrders(id, { page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());

    const res = await fetch(
      `${API_BASE}/api/admin/customers/${id}/orders?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      }
    );
    return handleResponse(res);
  },

  /**
   * Fetch customer wishlist products
   */
  async getCustomerWishlist(id, { page = 1, limit = 12 } = {}) {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());

    const res = await fetch(
      `${API_BASE}/api/admin/customers/${id}/wishlist?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      }
    );
    return handleResponse(res);
  },

  /**
   * Fetch customer activity log
   */
  async getCustomerActivity(id, { limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());

    const res = await fetch(
      `${API_BASE}/api/admin/customers/${id}/activity?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      }
    );
    return handleResponse(res);
  },

  /**
   * Fetch customer saved delivery addresses
   */
  async getCustomerAddresses(id) {
    const res = await fetch(`${API_BASE}/api/admin/customers/${id}/addresses`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Download CSV export file
   */
  async exportCsv({
    search = "",
    status = "all",
    hasOrders = "all",
    startDate = "",
    endDate = "",
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (hasOrders && hasOrders !== "all") params.append("hasOrders", hasOrders);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await fetch(
      `${API_BASE}/api/admin/customers/export?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!res.ok) {
      throw new Error(`CSV export failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rupkotha-customers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};


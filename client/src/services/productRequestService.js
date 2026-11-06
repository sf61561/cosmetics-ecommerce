import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "Product request operation failed.");
    error.status = response.status;
    error.field = data?.field;
    throw error;
  }

  return data;
}

export const productRequestService = {
  /**
   * Submit a new customer product request (public)
   */
  submitProductRequest: (data) =>
    request("/api/product-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Admin: List paginated product requests
   */
  getAdminProductRequests: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/api/admin/product-requests${qs ? `?${qs}` : ""}`);
  },

  /**
   * Admin: Get metrics across statuses
   */
  getAdminProductRequestMetrics: () =>
    request("/api/admin/product-requests/metrics"),

  /**
   * Admin: Get single request
   */
  getAdminProductRequestById: (id) =>
    request(`/api/admin/product-requests/${id}`),

  /**
   * Admin: Update request status and admin notes
   */
  updateAdminProductRequest: (id, data) =>
    request(`/api/admin/product-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /**
   * Admin: Delete request
   */
  deleteAdminProductRequest: (id) =>
    request(`/api/admin/product-requests/${id}`, {
      method: "DELETE",
    }),
};


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
    const error = new Error(data?.message || "Tag operation failed.");
    error.status = response.status;
    error.field = data?.field;
    throw error;
  }

  return data;
}

export const tagService = {
  /**
   * Admin: List paginated tags
   */
  getAdminTags: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/api/admin/tags${qs ? `?${qs}` : ""}`);
  },

  /**
   * Admin: Get single tag
   */
  getAdminTagById: (id) => request(`/api/admin/tags/${id}`),

  /**
   * Admin: Create new tag
   */
  createAdminTag: (data) =>
    request("/api/admin/tags", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Admin: Update existing tag
   */
  updateAdminTag: (id, data) =>
    request(`/api/admin/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /**
   * Admin: Delete tag
   */
  deleteAdminTag: (id) =>
    request(`/api/admin/tags/${id}`, {
      method: "DELETE",
    }),

  /**
   * Public: List all tags
   */
  getPublicTags: (params = {}) => {
    const query = new URLSearchParams(params);
    const qs = query.toString();
    return request(`/api/tags${qs ? `?${qs}` : ""}`);
  },
};


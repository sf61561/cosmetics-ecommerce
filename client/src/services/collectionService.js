import { API_BASE } from "./apiConfig";

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
    error.data = data;
    throw error;
  }

  return data;
}

export const collectionService = {
  /**
   * Fetch paginated collections with optional search, status filtering, and sorting
   */
  async getCollections({
    search = "",
    status = "all",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const res = await fetch(`${API_BASE}/api/admin/collections?${params.toString()}`, {
      method: "GET",
      credentials: "include", // Pass httpOnly auth cookies
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Fetch single collection by ID
   */
  async getCollectionById(id) {
    const res = await fetch(`${API_BASE}/api/admin/collections/${id}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Create a new collection
   * Accepts FormData (if uploading file) or plain object (JSON)
   */
  async createCollection(data) {
    let body;
    let headers = { Accept: "application/json" };

    if (data instanceof FormData) {
      body = data; // fetch sets correct multipart/form-data boundary automatically
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/api/admin/collections`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });

    return handleResponse(res);
  },

  /**
   * Update an existing collection by ID
   * Accepts FormData or plain object
   */
  async updateCollection(id, data) {
    let body;
    let headers = { Accept: "application/json" };

    if (data instanceof FormData) {
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/api/admin/collections/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers,
      body,
    });

    return handleResponse(res);
  },

  /**
   * Delete a collection by ID
   */
  async deleteCollection(id) {
    const res = await fetch(`${API_BASE}/api/admin/collections/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch top most sales collections
   */
  async getTopCollections(limit = 3) {
    const res = await fetch(`${API_BASE}/api/collections/top?limit=${limit}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch all active collections with filters & sorting
   */
  async getPublicCollections({
    limit = 12,
    page = 1,
    sortBy = "sales_count",
    sortOrder = "DESC",
    search = "",
    tag = "",
  } = {}) {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (page) params.append("page", page.toString());
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (search.trim()) params.append("search", search.trim());
    if (tag && tag.trim() && tag !== "all") params.append("tag", tag.trim());

    const res = await fetch(`${API_BASE}/api/collections?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch single collection with its products by slug
   */
  async getPublicCollectionBySlug(slug) {
    const res = await fetch(`${API_BASE}/api/collections/${slug}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },
};


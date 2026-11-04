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
    error.isAssociated = Boolean(data?.isAssociated);
    error.data = data;
    throw error;
  }

  return data;
}

export const brandService = {
  /**
   * Fetch paginated brands with search, status filtering, featured filter, and sorting
   */
  async getBrands({
    search = "",
    status = "all",
    isFeatured = "all",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (isFeatured && isFeatured !== "all") params.append("isFeatured", isFeatured.toString());
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const res = await fetch(`${API_BASE}/api/admin/brands?${params.toString()}`, {
      method: "GET",
      credentials: "include", // Pass httpOnly auth cookies
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Fetch single brand by ID
   */
  async getBrandById(id) {
    const res = await fetch(`${API_BASE}/api/admin/brands/${id}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Create a new brand
   * Accepts FormData (multipart with logo file) or plain object
   */
  async createBrand(data) {
    let body;
    let headers = { Accept: "application/json" };

    if (data instanceof FormData) {
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/api/admin/brands`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });

    return handleResponse(res);
  },

  /**
   * Update an existing brand by ID
   */
  async updateBrand(id, data) {
    let body;
    let headers = { Accept: "application/json" };

    if (data instanceof FormData) {
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers,
      body,
    });

    return handleResponse(res);
  },

  /**
   * Delete a brand by ID
   */
  async deleteBrand(id) {
    const res = await fetch(`${API_BASE}/api/admin/brands/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch brands ranked by units sold in delivered orders.
   */
  async getTopBrands(limit = 3) {
    const res = await fetch(`${API_BASE}/api/brands/top?limit=${limit}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch all active brands with optional A-Z letter filter, search, & sorting
   */
  async getPublicBrands({
    letter = "",
    search = "",
    sortBy = "name",
    sortOrder = "ASC",
    limit = 50,
    page = 1,
  } = {}) {
    const params = new URLSearchParams();
    if (letter && letter !== "All" && letter !== "all") params.append("letter", letter);
    if (search && search.trim()) params.append("search", search.trim());
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (limit) params.append("limit", limit.toString());
    if (page) params.append("page", page.toString());

    const res = await fetch(`${API_BASE}/api/brands?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Public storefront: Fetch single brand by slug
   */
  async getPublicBrandBySlug(slug) {
    const res = await fetch(`${API_BASE}/api/brands/${slug}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },
};


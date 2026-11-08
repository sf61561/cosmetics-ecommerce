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

export const productService = {
  /**
   * Fetch the public storefront product catalog
   */
  async getProducts({
    search = "",
    brandId = "all",
    categoryId = "all",
    collectionId = "all",
    page = 1,
    limit = 50,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (brandId && brandId !== "all") params.append("brandId", brandId);
    if (categoryId && categoryId !== "all") params.append("categoryId", categoryId);
    if (collectionId && collectionId !== "all") params.append("collectionId", collectionId);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);

    const res = await fetch(`${API_BASE}/api/products?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Fetch public product by slug for Product Details Page
   */
  async getProductBySlug(slug) {
    const res = await fetch(`${API_BASE}/api/products/${slug}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Fetch public storefront new arrivals (recently published products)
   */
  async getNewArrivals(limit = 8) {
    const res = await fetch(`${API_BASE}/api/products/new-arrivals?limit=${limit}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Fetch paginated products with search, filters, and summary metrics
   */
  async getAdminProducts({
    search = "",
    status = "all",
    brandId = "all",
    categoryId = "all",
    collectionId = "all",
    stockStatus = "all",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (brandId && brandId !== "all") params.append("brandId", brandId);
    if (categoryId && categoryId !== "all") params.append("categoryId", categoryId);
    if (collectionId && collectionId !== "all") params.append("collectionId", collectionId);
    if (stockStatus && stockStatus !== "all") params.append("stockStatus", stockStatus);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const res = await fetch(`${API_BASE}/api/admin/products?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Fetch single product by ID
   */
  async getAdminProductById(id) {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Create a new product (supports FormData with attached files or JSON)
   */
  async createProduct(formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await fetch(`${API_BASE}/api/admin/products`, {
      method: "POST",
      credentials: "include",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      body: isFormData ? formDataOrJson : JSON.stringify(formDataOrJson),
    });
    return handleResponse(res);
  },

  /**
   * Update product by ID (supports FormData with attached files or JSON)
   */
  async updateProduct(id, formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      body: isFormData ? formDataOrJson : JSON.stringify(formDataOrJson),
    });
    return handleResponse(res);
  },

  /**
   * Quick status update (ACTIVE / DRAFT / ARCHIVED)
   */
  async updateProductStatus(id, status) {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  /**
   * Delete product by ID
   */
  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Upload multiple product images to Cloudinary via backend
   */
  async uploadImages(files = []) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("images", file);
    }

    const res = await fetch(`${API_BASE}/api/admin/products/upload-images`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * Get all categories for selection
   */
  async getCategories() {
    const res = await fetch(`${API_BASE}/api/admin/products/categories/all`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Get all brands for selection
   */
  async getBrands() {
    const res = await fetch(`${API_BASE}/api/admin/brands?limit=100&status=all`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Get all collections for selection
   */
  async getCollections() {
    const res = await fetch(`${API_BASE}/api/admin/collections?limit=100&status=all`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Get all tags for product selection
   */
  async getTags() {
    const res = await fetch(`${API_BASE}/api/tags?limit=100`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },
};

/**
 * Safely parses `howToUse` from the database into structured steps.
 * Handles JSON array of steps [{ title, description }], single plain text, or empty.
 */
export function parseHowToUseSteps(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((s) => ({
        title: (s?.title || "").trim(),
        description: (s?.description || s?.text || s?.instruction || "").trim(),
      }))
      .filter((s) => s.title || s.description);
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s) => ({
            title: (s?.title || "").trim(),
            description: (s?.description || s?.text || s?.instruction || "").trim(),
          }))
          .filter((s) => s.title || s.description);
      }
    } catch {}
    if (val.trim()) {
      return [{ title: "Application Ritual", description: val.trim() }];
    }
  }
  return [];
}


import { API_BASE } from "./apiConfig";

/**
 * Handle API responses and extract JSON or error
 */
async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (response.status === 404
        ? "Wishlist or product not found."
        : response.status === 401
        ? "Please sign in to manage your wishlist."
        : `Request failed with status ${response.status}`);

    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data;
}

export const wishlistService = {
  /**
   * Fetch paginated customer wishlist
   */
  async getWishlist(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", params.page);
    if (params.limit) searchParams.set("limit", params.limit);
    const qs = searchParams.toString();
    const url = `${API_BASE}/api/wishlist${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Fetch array of wishlisted product IDs for fast status hydration
   */
  async getWishlistIds() {
    const res = await fetch(`${API_BASE}/api/wishlist/ids`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Add a product to wishlist
   */
  async addItem(productId, variantId = null) {
    const res = await fetch(`${API_BASE}/api/wishlist`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ productId, variantId }),
    });
    return handleResponse(res);
  },

  /**
   * Remove a product from wishlist
   */
  async removeItem(productId, variantId = null) {
    const qs = variantId ? `?variantId=${encodeURIComponent(variantId)}` : "";
    const res = await fetch(`${API_BASE}/api/wishlist/${productId}${qs}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Toggle product in wishlist
   */
  async toggleItem(productId, variantId = null) {
    const res = await fetch(`${API_BASE}/api/wishlist/toggle`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ productId, variantId }),
    });
    return handleResponse(res);
  },

  /**
   * Move wishlisted product to shopping bag
   */
  async moveToCart(productId, quantity = 1) {
    const res = await fetch(`${API_BASE}/api/wishlist/${productId}/move-to-cart`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(res);
  },

  /**
   * Clear all wishlist items
   */
  async clearWishlist() {
    const res = await fetch(`${API_BASE}/api/wishlist`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Merge guest wishlist array into database upon sign-in
   */
  async mergeGuestWishlist(productIds = []) {
    const res = await fetch(`${API_BASE}/api/wishlist/merge`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ productIds }),
    });
    return handleResponse(res);
  },
};


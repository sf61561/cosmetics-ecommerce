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
        ? "Cart or item not found."
        : response.status === 400
        ? "Invalid cart operation."
        : `Request failed with status ${response.status}`);

    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data;
}

export const cartService = {
  /**
   * Fetch current cart
   */
  async getCart() {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Add a product to the cart
   */
  async addItem(productId, quantity = 1, variantId = null) {
    const res = await fetch(`${API_BASE}/api/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ productId, quantity, variantId }),
    });
    return handleResponse(res);
  },

  /**
   * Update quantity of an existing item in the cart
   */
  async updateQuantity(cartItemId, quantity) {
    const res = await fetch(`${API_BASE}/api/cart/items/${cartItemId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(res);
  },

  /**
   * Update variant of an existing item in the cart
   */
  async updateVariant(cartItemId, variantId) {
    const res = await fetch(`${API_BASE}/api/cart/items/${cartItemId}/variant`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ variantId }),
    });
    return handleResponse(res);
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(cartItemId) {
    const res = await fetch(`${API_BASE}/api/cart/items/${cartItemId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },

  /**
   * Clear the entire cart
   */
  async clearCart() {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handleResponse(res);
  },
};


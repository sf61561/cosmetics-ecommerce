import { API_BASE } from "./apiConfig";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const recommendationService = {
  /**
   * Fetch personalized product recommendations for the customer (or guest fallback)
   */
  async getPersonalizedRecommendations(limit = 12) {
    const res = await fetch(`${API_BASE}/api/recommendations?limit=${limit}`, {
      method: "GET",
      credentials: "include", // Pass cookies (accessToken and eloura_session_id)
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },

  /**
   * Fetch related products for a specific product ID
   */
  async getRelatedProducts(productId, limit = 8) {
    if (!productId) return { success: true, data: [] };

    const res = await fetch(`${API_BASE}/api/products/${productId}/related?limit=${limit}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handleResponse(res);
  },
};


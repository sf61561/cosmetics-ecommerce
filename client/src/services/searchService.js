const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.message || `Search request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const searchService = {
  /**
   * Fast autocomplete suggestions for header dropdown
   */
  async getSuggestions(query, { limit = 6, signal } = {}) {
    if (!query || query.trim().length < 2) {
      return { query: "", products: [], collections: [], categories: [], brands: [], queries: [] };
    }

    const searchParams = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });

    const res = await fetch(`${API_BASE}/api/search/suggest?${searchParams.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const body = await handleResponse(res);
    return body?.data || { query: "", products: [], collections: [], categories: [], brands: [], queries: [] };
  },

  /**
   * Full faceted search
   */
  async search(params = {}, { signal } = {}) {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set("q", params.q.trim());
    if (params.collection && params.collection !== "all") searchParams.set("collection", params.collection);
    if (params.category && params.category !== "all") searchParams.set("category", params.category);
    if (params.brand && params.brand !== "all") searchParams.set("brand", params.brand);
    if (params.min !== undefined && params.min !== null && params.min !== "") searchParams.set("min", String(params.min));
    if (params.max !== undefined && params.max !== null && params.max !== "") searchParams.set("max", String(params.max));
    if (params.inStock === true || params.inStock === "true") searchParams.set("inStock", "true");
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    const url = `${API_BASE}/api/search${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const body = await handleResponse(res);
    return body?.data || {
      query: params.q || "",
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      items: [],
      facets: { categories: [], brands: [], priceRange: { min: 0, max: 0 } },
      didYouMean: null,
    };
  },
};


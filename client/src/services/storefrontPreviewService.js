import { API_BASE } from "./apiConfig";

export const storefrontPreviewService = {
  async getAdminContext() {
    const res = await fetch(`${API_BASE}/api/admin/storefront-preview/context`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(json?.message || "Access denied.");
      err.status = res.status;
      throw err;
    }

    return json?.data || { authorized: true, canPreviewDrafts: false, collections: [], brands: [], products: [] };
  },
};

import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Promotion request failed.");
    error.status = response.status;
    error.field = data?.field;
    throw error;
  }
  return data;
}

export const promotionService = {
  getDeliverySettings: () => request("/api/admin/delivery-settings"),
  getDeliveryRules: () => request("/api/admin/delivery-settings"),
  updateDeliverySettings: (data) =>
    request("/api/admin/delivery-settings", { method: "PUT", body: JSON.stringify(data) }),
  updateDeliveryRule: (id, data) =>
    request(`/api/admin/delivery-settings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createDeliveryRule: (data) =>
    request("/api/admin/delivery-settings", { method: "POST", body: JSON.stringify(data) }),
  getPublicDeliveryOptions: () => request("/api/promotions/delivery-options"),
  getCoupons: (params = {}) => {
    const query = new URLSearchParams(params);
    return request(`/api/admin/coupons?${query.toString()}`);
  },
  createCoupon: (data) =>
    request("/api/admin/coupons", { method: "POST", body: JSON.stringify(data) }),
  updateCoupon: (id, data) =>
    request(`/api/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateCouponStatus: (id, isActive) =>
    request(`/api/admin/coupons/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  calculateCart: (data) =>
    request("/api/promotions/calculate-cart", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

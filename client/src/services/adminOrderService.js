import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Order request failed.");
  return data.data;
}

export const adminOrderService = {
  list: (params = {}) => request(`/api/admin/orders?${new URLSearchParams(params).toString()}`),
  getById: (id) => request(`/api/admin/orders/${id}`),
  updateStatus: (id, status, payload = {}) => request(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...payload }),
  }),
  updateShipping: (id, payload = {}) => request(`/api/admin/orders/${id}/shipping`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  getCostHeaders: () => request("/api/admin/orders/cost-headers"),
  updateItemCosts: (id, itemCosts = []) => request(`/api/admin/orders/${id}/item-costs`, {
    method: "PATCH",
    body: JSON.stringify({ itemCosts }),
  }),
  addOtherCost: (id, payload = {}) => request(`/api/admin/orders/${id}/other-costs`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateOtherCost: (id, costId, payload = {}) => request(`/api/admin/orders/${id}/other-costs/${costId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  deleteOtherCost: (id, costId) => request(`/api/admin/orders/${id}/other-costs/${costId}`, {
    method: "DELETE",
  }),
};

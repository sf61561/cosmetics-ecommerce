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

export const orderService = {
  list: () => request("/api/orders"),
  create: (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  getById: (id) => request(`/api/orders/${id}`),
  cancel: (id, note = "") => request(`/api/orders/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ note }) }),
};

import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: options.body instanceof FormData ? {} : { Accept: "application/json", "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 401
      ? "Your admin session has expired. Please sign in again."
      : data?.message || "Hero slider request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.code;
    error.field = data?.field;
    throw error;
  }
  return data;
}

function toFormData(values) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  return formData;
}

export const heroSliderService = {
  getPublic: (placement = "home_hero") =>
    request(`/api/hero-sliders?placement=${encodeURIComponent(placement)}`, { credentials: undefined, cache: "no-store" }),
  list: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "" && value !== "all") {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    return request(`/api/admin/hero-sliders${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request(`/api/admin/hero-sliders/${id}`),
  create: (values) => request("/api/admin/hero-sliders", { method: "POST", body: toFormData(values) }),
  update: (id, values) => request(`/api/admin/hero-sliders/${id}`, { method: "PATCH", body: toFormData(values) }),
  updateStatus: (id, isActive) => request(`/api/admin/hero-sliders/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
  toggleStatus: (id) => request(`/api/admin/hero-sliders/${id}/toggle`, { method: "PATCH" }),
  duplicate: (id) => request(`/api/admin/hero-sliders/${id}/duplicate`, { method: "POST" }),
  reorder: (items) =>
    request("/api/admin/hero-sliders/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items, order: items }),
    }),
  remove: (id) => request(`/api/admin/hero-sliders/${id}`, { method: "DELETE" }),
};

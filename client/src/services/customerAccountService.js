import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Account request failed.");
    error.code = data?.code;
    throw error;
  }
  return data.data;
}

export const customerAccountService = {
  overview: () => request("/api/customer/overview"),
  updateProfile: (payload) => request("/api/customer/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await fetch(`${API_BASE}/api/customer/profile/avatar`, { method: "POST", credentials: "include", body: formData });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Profile photo upload failed.");
    return data.data;
  },
  updatePassword: (payload) => request("/api/customer/password", { method: "PATCH", body: JSON.stringify(payload) }),
  security: () => request("/api/customer/security"),
  requestPasswordSetup: async (email) => {
    const response = await fetch(`${API_BASE}/api/auth/password/setup/request`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to request a password setup link.");
    return data;
  },
  wishlist: () => request("/api/customer/wishlist"),
  addresses: () => request("/api/addresses"),
  addAddress: (payload) => request("/api/addresses", { method: "POST", body: JSON.stringify(payload) }),
  updateAddress: (id, payload) => request(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAddress: (id) => request(`/api/addresses/${id}`, { method: "DELETE" }),
};

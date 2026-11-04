import { API_BASE } from "./apiConfig";

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Audit log request failed.");
  return result;
}

export const adminAuditService = {
  list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, value);
    });
    return request(`/api/admin/audit-logs?${params.toString()}`);
  },
  getById(id) {
    return request(`/api/admin/audit-logs/${encodeURIComponent(id)}`);
  },
};

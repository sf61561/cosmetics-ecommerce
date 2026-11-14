import { API_BASE } from "./apiConfig";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: "application/json",
    ...(!isFormData && options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Admin return request failed.");
  }
  return data.data;
}

export const adminReturnService = {
  list: (params = {}) => request(`/api/admin/returns?${new URLSearchParams(params).toString()}`),
  getById: (id) => request(`/api/admin/returns/${id}`),
  updateStatus: (id, status, payload = {}) =>
    request(`/api/admin/returns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...payload }),
    }),
  requestPhotos: (id, prompt) =>
    request(`/api/admin/returns/${id}/request-photos`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  saveInspection: (id, payload = {}) =>
    request(`/api/admin/returns/${id}/inspection`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  uploadInspectionPhoto: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return request("/api/admin/returns/upload-inspection-photo", {
      method: "POST",
      body: formData,
    });
  },
  processRefund: (id, payload = {}) =>
    request(`/api/admin/returns/${id}/process-refund`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

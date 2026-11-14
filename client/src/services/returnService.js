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
    throw new Error(data?.message || "Return request failed.");
  }
  return data.data;
}

export const returnService = {
  uploadEvidence: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return request("/api/returns/upload-evidence", {
      method: "POST",
      body: formData,
    });
  },

  getOrderEligibility: (orderId) => request(`/api/returns/order/${orderId}/eligibility`),

  createReturn: (payload) =>
    request("/api/returns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  list: (params = {}) =>
    request(`/api/returns?${new URLSearchParams(params).toString()}`),

  getById: (id) => request(`/api/returns/${id}`),

  addPhotos: (id, images) =>
    request(`/api/returns/${id}/photos`, {
      method: "PATCH",
      body: JSON.stringify({ images }),
    }),
};

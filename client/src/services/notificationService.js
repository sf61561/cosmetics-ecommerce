import { API_BASE } from "./apiConfig";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (response.status === 401
        ? "Please sign in to view your notifications."
        : `Request failed with status ${response.status}`);

    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code || null;
    error.data = data;
    throw error;
  }

  return data;
}

export const notificationService = {
  /**
   * Fetch customer notifications feed
   */
  async getNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });

    const res = await fetch(`${API_BASE}/api/notifications?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data || { notifications: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  },

  /**
   * Get unread count for customer navbar bell
   */
  async getUnreadCount() {
    const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data?.unreadCount || 0;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data;
  },

  /**
   * Mark all customer notifications as read
   */
  async markAllAsRead() {
    const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data;
  },

  /**
   * Delete / dismiss a notification
   */
  async deleteNotification(id) {
    const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return handleResponse(res);
  },

  /**
   * Fetch customer notification preferences
   */
  async getPreferences() {
    const res = await fetch(`${API_BASE}/api/notifications/preferences`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data?.preferences || [];
  },

  /**
   * Update customer notification preferences
   */
  async updatePreferences(preferences) {
    const res = await fetch(`${API_BASE}/api/notifications/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ preferences }),
    });

    const json = await handleResponse(res);
    return json?.data?.preferences || [];
  },

  /**
   * Admin: Get notifications feed
   */
  async getAdminNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });

    const res = await fetch(`${API_BASE}/api/admin/notifications?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data || { notifications: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  },

  /**
   * Admin: Get unread count
   */
  async getAdminUnreadCount() {
    const res = await fetch(`${API_BASE}/api/admin/notifications/unread-count`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data?.unreadCount || 0;
  },

  /**
   * Admin: Mark all admin notifications read
   */
  async markAllAdminAsRead() {
    const res = await fetch(`${API_BASE}/api/admin/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data;
  },

  /**
   * Admin: Mark single admin notification read
   */
  async markAdminAsRead(id) {
    const res = await fetch(`${API_BASE}/api/admin/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const json = await handleResponse(res);
    return json?.data;
  },
};


import { API_BASE } from "./apiConfig";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Request failed with status ${response.status}`);
  }
  return result;
}

export const superadminService = {
  // ─── Administrator Account Management ───
  listAdmins(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "ALL") query.set("status", params.status);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    return request(`/api/superadmin/admins?${query.toString()}`);
  },

  inviteAdmin(data) {
    return request("/api/superadmin/admins/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  resendInvite(adminId) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/resend-invite`, {
      method: "POST",
    });
  },

  cancelInvite(adminId) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/cancel-invite`, {
      method: "DELETE",
    });
  },

  updatePermissions(adminId, { permissionKeys, superadminPassword }) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionKeys, superadminPassword }),
    });
  },

  updateStatus(adminId, status) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  forceLogout(adminId) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/force-logout`, {
      method: "POST",
    });
  },

  triggerPasswordReset(adminId) {
    return request(`/api/superadmin/admins/${encodeURIComponent(adminId)}/reset-password`, {
      method: "POST",
    });
  },

  // ─── Governance Dashboard & Audit Logs ───
  getDashboardOverview() {
    return request("/api/superadmin/dashboard/overview");
  },

  getDashboardSummary({ from, to, preset, compare = "previous" } = {}) {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (preset) query.set("preset", preset);
    if (compare) query.set("compare", compare);
    return request(`/api/superadmin/dashboard?${query.toString()}`);
  },

  getDashboardCharts({ from, to, preset, refresh = false } = {}) {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (preset) query.set("preset", preset);
    if (refresh) query.set("refresh", "true");
    return request(`/api/superadmin/dashboard/charts?${query.toString()}`);
  },

  getDashboardActivity({ page = 1, limit = 15, actorId = "", action = "" } = {}) {
    const query = new URLSearchParams();
    query.set("page", page);
    query.set("limit", limit);
    if (actorId) query.set("actorId", actorId);
    if (action) query.set("action", action);
    return request(`/api/superadmin/dashboard/activity?${query.toString()}`);
  },

  listAuditLogs(filters = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) query.set(key, value);
    });
    return request(`/api/superadmin/audit-logs?${query.toString()}`);
  },

  getAuditLogById(id) {
    return request(`/api/superadmin/audit-logs/${encodeURIComponent(id)}`);
  },

  // ─── Master Permissions ───
  listPermissions() {
    return request("/api/superadmin/permissions");
  },

  // ─── Presets ───
  listPresets() {
    return request("/api/superadmin/permissions/presets");
  },

  createPreset(data) {
    return request("/api/superadmin/permissions/presets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePreset(presetId, data) {
    return request(`/api/superadmin/permissions/presets/${encodeURIComponent(presetId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deletePreset(presetId) {
    return request(`/api/superadmin/permissions/presets/${encodeURIComponent(presetId)}`, {
      method: "DELETE",
    });
  },

  // ─── Admin / Super Admin Password Change via Email OTP ───
  requestPasswordChangeCode(isSuperAdmin = false) {
    const endpoint = isSuperAdmin
      ? "/api/superadmin/profile/password/request-code"
      : "/api/admin/profile/password/request-code";
    return request(endpoint, {
      method: "POST",
    });
  },

  confirmPasswordChange({ code, currentPassword, newPassword }, isSuperAdmin = false) {
    const endpoint = isSuperAdmin
      ? "/api/superadmin/profile/password/confirm"
      : "/api/admin/profile/password/confirm";
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify({ code, currentPassword, newPassword }),
    });
  },

  // ─── Invited Admin Onboarding ───
  verifyAdminInvite(token) {
    return request(`/api/auth/admin-invite/verify?token=${encodeURIComponent(token)}`);
  },

  acceptAdminInvite({ token, name, password }) {
    return request("/api/auth/admin-invite/accept", {
      method: "POST",
      body: JSON.stringify({ token, name, password }),
    });
  },
};

export default superadminService;

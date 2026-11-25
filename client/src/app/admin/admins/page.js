"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import superadminService from "@/services/superadminService";
import InviteAdminModal from "@/components/admin/admins/InviteAdminModal";
import EditPermissionsModal from "@/components/admin/admins/EditPermissionsModal";
import {
  IoShieldCheckmarkOutline,
  IoPersonAddOutline,
  IoSearchOutline,
  IoEllipsisVertical,
  IoMailOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTimeOutline,
  IoLockClosedOutline,
  IoLogOutOutline,
  IoRefreshOutline,
  IoKeyOutline,
} from "react-icons/io5";

export default function SuperadminAdminsPage() {
  const { user, isSuperAdmin, isLoading: authLoading } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, invited: 0, disabled: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editPermissionsModalOpen, setEditPermissionsModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const fetchAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError("");
    try {
      const data = await superadminService.listAdmins({
        search,
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setAdmins(data.admins || []);
      setCounts(data.counts || { all: 0, active: 0, invited: 0, disabled: 0 });
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || "Failed to load administrator accounts.");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, search, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const handleResendInvite = async (adminId) => {
    try {
      const res = await superadminService.resendInvite(adminId);
      showNotification(res.message || "Invitation resent successfully.");
      fetchAdmins();
    } catch (err) {
      setError(err.message || "Failed to resend invitation.");
    }
  };

  const handleCancelInvite = async (adminId) => {
    if (!window.confirm("Are you sure you want to cancel this pending invitation?")) return;
    try {
      const res = await superadminService.cancelInvite(adminId);
      showNotification(res.message || "Invitation cancelled.");
      fetchAdmins();
    } catch (err) {
      setError(err.message || "Failed to cancel invitation.");
    }
  };

  const handleToggleStatus = async (admin) => {
    const nextStatus = admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const confirmText =
      nextStatus === "DISABLED"
        ? `Are you sure you want to deactivate ${admin.name || admin.email}? They will be blocked from accessing all admin tools.`
        : `Activate ${admin.name || admin.email}?`;

    if (!window.confirm(confirmText)) return;

    try {
      const res = await superadminService.updateAdminStatus(admin.id, nextStatus);
      showNotification(res.message || "Status updated.");
      fetchAdmins();
    } catch (err) {
      setError(err.message || "Failed to update account status.");
    }
  };

  const handleForceLogout = async (adminId) => {
    if (!window.confirm("Terminate all active sessions for this administrator across all devices?")) return;
    try {
      const res = await superadminService.forceLogout(adminId);
      showNotification(res.message || "Sessions terminated.");
    } catch (err) {
      setError(err.message || "Failed to terminate sessions.");
    }
  };

  const handleTriggerPasswordReset = async (adminId) => {
    if (!window.confirm("Send a secure 1-hour password reset link to this administrator's email?")) return;
    try {
      const res = await superadminService.triggerPasswordReset(adminId);
      showNotification(res.message || "Password reset email dispatched.");
    } catch (err) {
      setError(err.message || "Failed to trigger password reset.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#8B5CF6] mx-auto">
            <IoShieldCheckmarkOutline className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Super Administrator Restricted
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Only Super Administrators hold governance access to administrator management and privilege assignment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Administrators & Privileges
            </h1>
            <span className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage admin users, send onboarding invitations, and control fine-grained operational permissions
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-all cursor-pointer"
        >
          <IoPersonAddOutline className="h-4 w-4" />
          <span>Invite Administrator</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <IoCheckmarkCircle className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Total Staff
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {counts.all}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Active Accounts
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {counts.active}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <p className="text-[11px] font-medium text-amber-500 dark:text-amber-400 uppercase tracking-wider">
            Pending Invites
          </p>
          <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-2">
            {counts.invited}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 uppercase tracking-wider">
            Disabled Accounts
          </p>
          <p className="text-2xl font-bold text-rose-500 dark:text-rose-400 mt-2">
            {counts.disabled}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800/80 w-fit">
          {[
            { id: "ALL", label: "All", count: counts.all },
            { id: "ACTIVE", label: "Active", count: counts.active },
            { id: "INVITED", label: "Pending", count: counts.invited },
            { id: "DISABLED", label: "Disabled", count: counts.disabled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-9 shadow-2xs"
          />
          <IoSearchOutline className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Administrators Table */}
      <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/75 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Permissions</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent mx-auto" />
                    <p className="text-xs text-gray-400 mt-2">Loading administrators...</p>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No administrators found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isCurrentSuper = admin.role === "SUPERADMIN";
                  const permCount = (admin.permissions || []).length;

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#EED9DC] to-[#DACCEF] dark:from-purple-950 dark:to-pink-950 text-[#3B2C58] dark:text-purple-200 text-xs font-bold uppercase shadow-2xs">
                            {(admin.name || admin.email || "A").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {admin.name || "Pending Onboarding"}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isCurrentSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                            Admin
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {admin.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            <IoCheckmarkCircle className="h-3 w-3" />
                            Active
                          </span>
                        )}
                        {admin.status === "INVITED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            <IoTimeOutline className="h-3 w-3" />
                            Invited (Pending)
                          </span>
                        )}
                        {admin.status === "DISABLED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                            <IoCloseCircle className="h-3 w-3" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="px-6 py-4">
                        {isCurrentSuper ? (
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            Full Access (Unrestricted)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {permCount}
                            </span>{" "}
                            granted
                          </span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="px-6 py-4 text-[11px] text-gray-400 dark:text-gray-500">
                        {admin.last_login_at
                          ? new Date(admin.last_login_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : admin.status === "INVITED"
                          ? "Never (Awaiting setup)"
                          : "Not recorded"}
                      </td>

                      {/* Actions Menu */}
                      <td className="px-6 py-4 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === admin.id ? null : admin.id);
                          }}
                          className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <IoEllipsisVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === admin.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-6 top-12 z-30 w-52 rounded-2xl bg-white dark:bg-gray-900 py-1.5 shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100 text-left"
                          >
                            {/* Invited Actions */}
                            {admin.status === "INVITED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleResendInvite(admin.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                  <IoRefreshOutline className="h-4 w-4 text-[#8B5CF6]" />
                                  <span>Resend Invite Email</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleCancelInvite(admin.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <IoCloseCircle className="h-4 w-4" />
                                  <span>Cancel Invitation</span>
                                </button>
                              </>
                            )}

                            {/* Active or Disabled Actions */}
                            {admin.status !== "INVITED" && (
                              <>
                                {!isCurrentSuper && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setSelectedAdmin(admin);
                                      setEditPermissionsModalOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                  >
                                    <IoShieldCheckmarkOutline className="h-4 w-4 text-[#8B5CF6]" />
                                    <span>Edit Permissions</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleTriggerPasswordReset(admin.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                  <IoKeyOutline className="h-4 w-4 text-amber-500" />
                                  <span>Send Password Reset</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleForceLogout(admin.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                  <IoLogOutOutline className="h-4 w-4 text-gray-400" />
                                  <span>Force Logout</span>
                                </button>

                                {/* Toggle Disable / Activate */}
                                {!isCurrentSuper && (
                                  <div className="border-t border-gray-100 dark:border-gray-800 pt-1 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        handleToggleStatus(admin);
                                      }}
                                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-xs transition-colors cursor-pointer ${
                                        admin.status === "ACTIVE"
                                          ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                          : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                      }`}
                                    >
                                      {admin.status === "ACTIVE" ? (
                                        <>
                                          <IoCloseCircle className="h-4 w-4" />
                                          <span>Disable Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <IoCheckmarkCircle className="h-4 w-4" />
                                          <span>Activate Account</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} administrators
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Admin Modal */}
      <InviteAdminModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          showNotification("Administrator invitation dispatched via email.");
          fetchAdmins();
        }}
      />

      {/* Edit Permissions Modal */}
      <EditPermissionsModal
        isOpen={editPermissionsModalOpen}
        admin={selectedAdmin}
        onClose={() => {
          setEditPermissionsModalOpen(false);
          setSelectedAdmin(null);
        }}
        onSuccess={() => {
          showNotification("Administrator permissions updated successfully.");
          fetchAdmins();
        }}
      />
    </div>
  );
}

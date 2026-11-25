"use client";

import { useState, useEffect } from "react";
import superadminService from "@/services/superadminService";
import { IoClose, IoShieldCheckmarkOutline, IoLockClosedOutline } from "react-icons/io5";

export default function EditPermissionsModal({ isOpen, admin, onClose, onSuccess }) {
  const [permissions, setPermissions] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [superadminPassword, setSuperadminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !admin) return;
    setError("");
    setSuperadminPassword("");

    // Initial selected keys from admin.permissions
    const currentKeys = (admin.permissions || []).map((p) => (typeof p === "string" ? p : p.key));
    setSelectedKeys(new Set(currentKeys));

    const loadAllPermissions = async () => {
      setLoading(true);
      try {
        const res = await superadminService.listPermissions();
        setPermissions(res.permissions || []);
      } catch (err) {
        setError(err.message || "Failed to load master permissions.");
      } finally {
        setLoading(false);
      }
    };

    loadAllPermissions();
  }, [isOpen, admin]);

  if (!isOpen || !admin) return null;

  const categories = permissions.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const handleToggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleCategory = (catPermissions) => {
    const allKeys = catPermissions.map((p) => p.key);
    const hasAll = allKeys.every((k) => selectedKeys.has(k));

    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (hasAll) {
        allKeys.forEach((k) => next.delete(k));
      } else {
        allKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!superadminPassword) {
      setError("Please enter your Super Admin password to confirm permission updates.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await superadminService.updatePermissions(admin.id, {
        permissionKeys: Array.from(selectedKeys),
        superadminPassword,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#8B5CF6]">
              <IoShieldCheckmarkOutline className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Edit Permissions — {admin.name || admin.email}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Modify role permissions for {admin.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent mx-auto" />
              <p className="text-xs text-gray-400 mt-2">Loading permissions...</p>
            </div>
          ) : (
            <form id="edit-permissions-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Assigned Privileges ({selectedKeys.size} active)
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedKeys(new Set(permissions.map((p) => p.key)))}
                    className="text-[#8B5CF6] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedKeys(new Set())}
                    className="text-gray-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(categories).map(([category, catPerms]) => {
                  const allCatSelected = catPerms.every((p) => selectedKeys.has(p.key));
                  return (
                    <div
                      key={category}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-[11px]">
                          {category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(catPerms)}
                          className="text-[11px] text-[#8B5CF6] hover:underline cursor-pointer"
                        >
                          {allCatSelected ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {catPerms.map((perm) => {
                          const isChecked = selectedKeys.has(perm.key);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 rounded-xl p-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                                  : "hover:bg-gray-100/60 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleKey(perm.key)}
                                className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                              />
                              <div className="space-y-0.5">
                                <p className="text-xs font-medium leading-none">{perm.name}</p>
                                {perm.description && (
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Super Admin Password Re-Verification */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2">
                  <IoLockClosedOutline className="h-4 w-4 text-[#8B5CF6]" />
                  <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Confirm Super Admin Password <span className="text-rose-500">*</span>
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Modifying administrator access privileges requires your Super Admin password.
                </p>
                <input
                  type="password"
                  value={superadminPassword}
                  onChange={(e) => setSuperadminPassword(e.target.value)}
                  placeholder="Enter your Super Admin password"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden"
                  required
                />
              </div>
            </form>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-permissions-form"
            disabled={submitting || loading}
            className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-6 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving Changes..." : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}

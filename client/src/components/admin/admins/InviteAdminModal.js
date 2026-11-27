"use client";

import { useState, useEffect } from "react";
import superadminService from "@/services/superadminService";
import { IoClose, IoMailOutline, IoPersonOutline, IoShieldCheckmarkOutline, IoBookmarkOutline } from "react-icons/io5";

export default function InviteAdminModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState(new Set());

  // Save as preset options
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setEmail("");
    setName("");
    setSelectedPresetId("");
    setSelectedPermissionKeys(new Set());
    setSaveAsPreset(false);
    setNewPresetName("");
    setNewPresetDescription("");

    const fetchData = async () => {
      setLoading(true);
      try {
        const [permsRes, presetsRes] = await Promise.all([
          superadminService.listPermissions(),
          superadminService.listPresets(),
        ]);
        setPermissions(permsRes.permissions || []);
        setPresets(presetsRes.presets || []);
      } catch (err) {
        setError(err.message || "Failed to load permissions list.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  // Group permissions by domain group
  const categories = permissions.reduce((acc, p) => {
    const groupName = p.group || p.category || "General";
    acc[groupName] = acc[groupName] || [];
    acc[groupName].push(p);
    return acc;
  }, {});

  const handlePresetSelect = (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;

    const preset = presets.find((pr) => pr.id === presetId);
    if (preset && Array.isArray(preset.permissions)) {
      const keys = preset.permissions.map((p) => (typeof p === "string" ? p : p.key));
      setSelectedPermissionKeys(new Set(keys));
    }
  };

  const handleTogglePermission = (key) => {
    setSelectedPermissionKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === "storefront.view") {
          next.delete("storefront.preview_drafts");
        }
      } else {
        next.add(key);
        if (key === "storefront.preview_drafts") {
          next.add("storefront.view");
        }
      }
      return next;
    });
  };

  const handleToggleCategory = (catPermissions) => {
    const allKeys = catPermissions.map((p) => p.key);
    const hasAll = allKeys.every((k) => selectedPermissionKeys.has(k));

    setSelectedPermissionKeys((prev) => {
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
    if (!email || !email.trim()) {
      setError("Email address is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const permissionKeys = Array.from(selectedPermissionKeys);

      // If user checked "Save as Preset", create preset first
      if (saveAsPreset && newPresetName.trim()) {
        try {
          await superadminService.createPreset({
            name: newPresetName.trim(),
            description: newPresetDescription.trim() || null,
            permissionKeys,
          });
        } catch (presetErr) {
          console.warn("Could not save preset:", presetErr.message);
        }
      }

      await superadminService.inviteAdmin({
        email: email.trim(),
        name: name.trim() || null,
        permissionKeys,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to send invitation.");
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
              <IoMailOutline className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Invite Administrator
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Send a 48-hour secure onboarding invitation
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

        {/* Scrollable Form Body */}
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
            <form id="invite-admin-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@eloura.com"
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-10"
                      required
                    />
                    <IoMailOutline className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-10"
                    />
                    <IoPersonOutline className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Preset Selector */}
              {presets.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Apply Saved Permission Preset
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Custom Permissions (No Preset) --</option>
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} {preset.description ? `— ${preset.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Permissions Matrix */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <IoShieldCheckmarkOutline className="h-4 w-4 text-[#8B5CF6]" />
                    Assign Operational Permissions ({selectedPermissionKeys.size} selected)
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPermissionKeys(new Set(permissions.map((p) => p.key)))}
                      className="text-[#8B5CF6] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermissionKeys(new Set())}
                      className="text-gray-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(categories).map(([category, catPerms]) => {
                    const allCatSelected = catPerms.every((p) => selectedPermissionKeys.has(p.key));
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
                            const isChecked = selectedPermissionKeys.has(perm.key);
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
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                                />
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium leading-none">{perm.label || perm.name}</p>
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
              </div>

              {/* Save as Preset Section */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsPreset}
                    onChange={(e) => setSaveAsPreset(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <IoBookmarkOutline className="h-4 w-4 text-[#8B5CF6]" />
                    Save this configuration as a reusable preset
                  </span>
                </label>

                {saveAsPreset && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Preset Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="e.g. Fulfillment Specialist, Catalog Editor"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newPresetDescription}
                        onChange={(e) => setNewPresetDescription(e.target.value)}
                        placeholder="e.g. Grants access to order processing and fulfillment"
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
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
            form="invite-admin-form"
            disabled={submitting || loading}
            className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-6 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Sending Invitation..." : "Send Invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

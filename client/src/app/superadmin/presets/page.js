"use client";

import { useState, useEffect, useCallback } from "react";
import superadminService from "@/services/superadminService";
import {
  IoBookmarkOutline,
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoClose,
  IoCheckmarkCircle,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";

export default function SuperadminPresetsPage() {
  const [presets, setPresets] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [presetsRes, permsRes] = await Promise.all([
        superadminService.listPresets(),
        superadminService.listPermissions(),
      ]);
      setPresets(presetsRes.presets || []);
      setPermissions(permsRes.permissions || []);
    } catch (err) {
      setError(err.message || "Failed to load permission presets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const openCreateModal = () => {
    setEditingPreset(null);
    setPresetName("");
    setPresetDescription("");
    setSelectedKeys(new Set());
    setModalError("");
    setModalOpen(true);
  };

  const openEditModal = (preset) => {
    setEditingPreset(preset);
    setPresetName(preset.name || "");
    setPresetDescription(preset.description || "");
    const keys = (preset.permissions || []).map((p) => (typeof p === "string" ? p : p.key));
    setSelectedKeys(new Set(keys));
    setModalError("");
    setModalOpen(true);
  };

  const handleToggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleGroup = (groupPerms) => {
    const keys = groupPerms.map((p) => p.key);
    const hasAll = keys.every((k) => selectedKeys.has(k));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (hasAll) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!presetName.trim()) {
      setModalError("Preset name is required.");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      const payload = {
        name: presetName.trim(),
        description: presetDescription.trim() || null,
        permissionKeys: Array.from(selectedKeys),
      };
      if (editingPreset) {
        await superadminService.updatePreset(editingPreset.id, payload);
        showToast("Permission preset updated.");
      } else {
        await superadminService.createPreset(payload);
        showToast("Permission preset created.");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.message || "Failed to save preset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (preset) => {
    if (!window.confirm(`Delete preset "${preset.name}"? Existing admins keep their current permissions.`)) {
      return;
    }
    try {
      await superadminService.deletePreset(preset.id);
      showToast("Permission preset deleted.");
      loadData();
    } catch (err) {
      setError(err.message || "Failed to delete preset.");
    }
  };

  const groupedPermissions = permissions.reduce((acc, p) => {
    const groupName = p.group || "General";
    acc[groupName] = acc[groupName] || [];
    acc[groupName].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">
            Access Templates
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permission Presets
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Create and manage custom reusable capability bundles for inviting store administrators.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-opacity cursor-pointer w-fit"
        >
          <IoAddOutline className="h-4 w-4" />
          <span>Create Preset</span>
        </button>
      </header>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <IoCheckmarkCircle className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading presets...</p>
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#8B5CF6] mx-auto">
            <IoBookmarkOutline className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            No custom presets created yet
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Start by creating your own custom presets (for example: Order Manager, Catalog Editor, or Returns Specialist).
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors cursor-pointer"
          >
            <IoAddOutline className="h-4 w-4" />
            <span>Create First Preset</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {preset.name}
                    </h3>
                    {preset.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {preset.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300 shrink-0">
                    {(preset.permissions || []).length} perms
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(preset.permissions || []).slice(0, 6).map((perm) => (
                    <span
                      key={perm.key}
                      className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300"
                    >
                      {perm.label || perm.key}
                    </span>
                  ))}
                  {(preset.permissions || []).length > 6 && (
                    <span className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-500">
                      +{preset.permissions.length - 6} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => openEditModal(preset)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <IoCreateOutline className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(preset)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <IoTrashOutline className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#8B5CF6]">
                  <IoBookmarkOutline className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {editingPreset ? "Edit Permission Preset" : "Create Permission Preset"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Bundle operational capabilities into a reusable template
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {modalError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  {modalError}
                </div>
              )}

              <form id="preset-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Preset Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="e.g. Order Manager"
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      placeholder="Short role summary"
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <IoShieldCheckmarkOutline className="h-4 w-4 text-[#8B5CF6]" />
                      Select Capabilities ({selectedKeys.size} selected)
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

                  {Object.entries(groupedPermissions).map(([group, groupPerms]) => {
                    const allSelected = groupPerms.every((p) => selectedKeys.has(p.key));
                    return (
                      <div
                        key={group}
                        className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                          <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                            {group}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleGroup(groupPerms)}
                            className="text-[11px] text-[#8B5CF6] hover:underline cursor-pointer"
                          >
                            {allSelected ? "Deselect Group" : "Select Group"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {groupPerms.map((perm) => {
                            const checked = selectedKeys.has(perm.key);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 rounded-xl p-2 cursor-pointer transition-colors ${
                                  checked
                                    ? "bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                                    : "hover:bg-gray-100/60 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleKey(perm.key)}
                                  className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                                />
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium leading-none">{perm.label}</p>
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
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="rounded-full px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="preset-form"
                disabled={submitting}
                className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-6 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving..." : editingPreset ? "Update Preset" : "Create Preset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

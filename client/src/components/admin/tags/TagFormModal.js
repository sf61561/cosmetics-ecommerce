"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaTag, FaSpinner, FaLock, FaLockOpen } from "react-icons/fa";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function TagFormModal({
  isOpen,
  onClose,
  tag = null,
  onSubmit,
}) {
  const isEditMode = Boolean(tag);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name || "");
        setSlug(tag.slug || "");
        setIsSlugCustomized(true);
        setDescription(tag.description || "");
      } else {
        setName("");
        setSlug("");
        setIsSlugCustomized(false);
        setDescription("");
      }
      setErrors({});
      setServerError("");
    }
  }, [isOpen, tag]);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (errors.name) setErrors((prev) => ({ ...prev, name: null }));

    if (!isSlugCustomized) {
      setSlug(slugify(val));
      if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
    }
  };

  const handleSlugChange = (e) => {
    setIsSlugCustomized(true);
    setSlug(slugify(e.target.value));
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Tag name is required.";
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      newErrors.name = "Tag name must be between 2 and 100 characters.";
    }

    if (!slug.trim()) {
      newErrors.slug = "Slug is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.message || "Failed to save tag.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] flex items-center justify-center">
              <FaTag className="text-sm" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                {isEditMode ? "Edit Tag" : "Create New Tag"}
              </h3>
              <p className="text-xs text-gray-400">
                {isEditMode ? "Update tag attributes and description" : "Add a tag name for product categorization and badges"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          {/* Live Tag Preview */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F5] dark:bg-gray-800/40 border border-pink-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Tag Preview
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-[#9B4F5E] dark:text-rose-300 border border-rose-200/80 dark:border-rose-900 shadow-2xs">
              <FaTag className="text-[10px]" />
              <span>{name.trim() || "Tag Name"}</span>
            </span>
          </div>

          {/* Tag Name Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Cruelty-Free, Best Seller, Glass Skin"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all ${
                errors.name
                  ? "border-red-400 ring-1 ring-red-300"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              autoFocus
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug Input with Lock/Unlock */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Slug <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsSlugCustomized((prev) => !prev)}
                className="text-[11px] text-gray-400 hover:text-[#9B4F5E] flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isSlugCustomized ? (
                  <>
                    <FaLockOpen className="text-[10px]" />
                    <span>Customized</span>
                  </>
                ) : (
                  <>
                    <FaLock className="text-[10px]" />
                    <span>Auto-generated</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 focus-within:ring-1 focus-within:ring-[#9B4F5E]">
              <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700/60 border-r border-gray-200 dark:border-gray-700 select-none">
                #
              </span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="cruelty-free"
                className="flex-1 px-3 py-2.5 text-xs bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              />
            </div>
            {errors.slug && (
              <p className="text-[11px] text-red-500 mt-1">{errors.slug}</p>
            )}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how this tag is used or criteria for tagged items..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E] transition-all resize-none"
            />
          </div>
        </form>

        {/* Pinned Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin text-xs" />
                <span>{isEditMode ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <span>{isEditMode ? "Save Changes" : "Create Tag"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { FaTimes, FaLock, FaLockOpen, FaSpinner, FaExclamationTriangle, FaStar, FaGlobe } from "react-icons/fa";
import BrandLogoUpload from "./BrandLogoUpload";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function BrandFormContent({
  brand,
  onClose,
  onSubmit,
  isSubmitting,
  serverError,
}) {
  const isEditMode = Boolean(brand);

  // Initialize state directly from props (re-mounted on key change)
  const [name, setName] = useState(brand?.name || "");
  const [slug, setSlug] = useState(brand?.slug || "");
  const [isSlugCustomized, setIsSlugCustomized] = useState(isEditMode);
  const [description, setDescription] = useState(brand?.description || "");
  const [websiteUrl, setWebsiteUrl] = useState(brand?.websiteUrl || "");
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(brand?.isFeatured ?? false);
  const [logoFile, setLogoFile] = useState(null);
  const [clientErrors, setClientErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Derive errors combining client-side and server-side errors
  const errors = {
    ...clientErrors,
    ...(serverError?.field ? { [serverError.field]: serverError.message } : {}),
    ...(serverError?.message && !serverError.field ? { form: serverError.message } : {}),
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setIsDirty(true);

    if (clientErrors.name) {
      setClientErrors((prev) => ({ ...prev, name: null }));
    }

    if (!isSlugCustomized) {
      setSlug(slugify(val));
      if (clientErrors.slug) {
        setClientErrors((prev) => ({ ...prev, slug: null }));
      }
    }
  };

  const handleSlugChange = (e) => {
    setIsSlugCustomized(true);
    setIsDirty(true);
    setSlug(slugify(e.target.value));
    if (clientErrors.slug) {
      setClientErrors((prev) => ({ ...prev, slug: null }));
    }
  };

  const handleToggleSlugLock = () => {
    if (isSlugCustomized) {
      setIsSlugCustomized(false);
      setSlug(slugify(name));
    } else {
      setIsSlugCustomized(true);
    }
  };

  const handleSafeClose = () => {
    if (isDirty && !isSubmitting) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Brand name is required.";
    } else if (name.trim().length < 2) {
      newErrors.name = "Brand name must be at least 2 characters.";
    } else if (name.trim().length > 150) {
      newErrors.name = "Brand name cannot exceed 150 characters.";
    }

    const currentSlug = slug.trim() || slugify(name);
    if (!currentSlug) {
      newErrors.slug = "A URL slug is required.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(currentSlug)) {
      newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    const payload = new FormData();
    payload.append("name", name.trim());
    payload.append("slug", slug.trim() || slugify(name));
    payload.append("description", description.trim());
    payload.append("websiteUrl", websiteUrl.trim());
    payload.append("isActive", isActive.toString());
    payload.append("isFeatured", isFeatured.toString());

    if (logoFile) {
      payload.append("logo", logoFile);
    }

    await onSubmit(payload);
  };

  return (
    <div className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-100 dark:border-gray-800 z-10">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4 bg-gradient-to-r from-[#FBF0F0]/60 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isEditMode ? "Edit Brand" : "Add New Brand"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isEditMode
              ? "Update brand profile, official imagery, and partner visibility."
              : "Register a cosmetics partner or brand for your beauty catalog."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSafeClose}
          aria-label="Close modal"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Form Error Banner */}
          {errors.form && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-700 dark:text-red-300 flex items-start gap-2.5">
              <FaExclamationTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Brand Name */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="brand-name"
                className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase"
              >
                Brand Name <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">{name.length}/150</span>
            </div>
            <input
              id="brand-name"
              type="text"
              value={name}
              maxLength={150}
              onChange={handleNameChange}
              placeholder="e.g. The Ordinary, COSRX, CeraVe"
              className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden transition-all bg-white dark:bg-gray-800 ${
                errors.name
                  ? "border-red-400 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40"
                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:ring-2 focus:ring-[#9B4F5E]/15"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="brand-slug"
                className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase"
              >
                URL Slug <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleToggleSlugLock}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#9B4F5E] dark:text-pink-400 hover:underline cursor-pointer"
              >
                {isSlugCustomized ? (
                  <>
                    <FaLockOpen className="h-2.5 w-2.5" /> Auto-sync with name
                  </>
                ) : (
                  <>
                    <FaLock className="h-2.5 w-2.5" /> Customize manually
                  </>
                )}
              </button>
            </div>
            <div className="relative mt-1.5 flex rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden focus-within:border-[#9B4F5E] dark:focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-[#9B4F5E]/15">
              <span className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3.5 text-xs text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 select-none">
                rupkotha.com/brands/
              </span>
              <input
                id="brand-slug"
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="the-ordinary"
                className="w-full px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
              />
            </div>
            {errors.slug && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{errors.slug}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="brand-description"
                className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase"
              >
                Description <span className="text-gray-400 dark:text-gray-500 font-normal lowercase">(optional)</span>
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">{description.length}/1000</span>
            </div>
            <textarea
              id="brand-description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Brand philosophy, country of origin, primary skincare specializations..."
              className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/15 transition-all resize-y"
            />
          </div>

          {/* Official Website URL */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="brand-website"
                className="block text-xs font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase"
              >
                Official Website <span className="text-gray-400 dark:text-gray-500 font-normal lowercase">(optional)</span>
              </label>
            </div>
            <div className="relative mt-1.5 flex rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden focus-within:border-[#9B4F5E] dark:focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-[#9B4F5E]/15">
              <span className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3.5 text-xs text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                <FaGlobe className="h-3.5 w-3.5" />
              </span>
              <input
                id="brand-website"
                type="text"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="https://theordinary.com"
                className="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cloudinary Brand Logo Upload */}
          <BrandLogoUpload
            currentLogoUrl={brand?.logoUrl}
            selectedFile={logoFile}
            onFileSelect={(file) => {
              setLogoFile(file);
              setIsDirty(true);
            }}
            onFileRemove={() => {
              setLogoFile(null);
              setIsDirty(true);
            }}
            error={errors.logo}
          />

          {/* Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Active Status */}
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active Brand</span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isActive ? "Visible in filters and shop" : "Hidden from customers"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => {
                  setIsActive((prev) => !prev);
                  setIsDirty(true);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/30 ${
                  isActive ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Featured Brand */}
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <FaStar className="h-3 w-3 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Featured Partner</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isFeatured ? "Included in featured-brand filters" : "Standard catalog brand"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isFeatured}
                onClick={() => {
                  setIsFeatured((prev) => !prev);
                  setIsDirty(true);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 ${
                  isFeatured ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isFeatured ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/80 px-6 py-3.5">
          <button
            type="button"
            onClick={handleSafeClose}
            disabled={isSubmitting}
            className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isSubmitting && <FaSpinner className="h-3 w-3 animate-spin" />}
            {isSubmitting
              ? isEditMode
                ? "Saving Changes..."
                : "Registering..."
              : isEditMode
              ? "Update Brand"
              : "Register Brand"}
          </button>
        </div>
      </form>

      {/* Discard Changes Prompt */}
      {showDiscardConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-2xl text-center">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Discard unsaved changes?</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              You have unsaved changes in this form. If you close now, your edits will be lost.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandFormModal({
  isOpen,
  onClose,
  onSubmit,
  brand = null,
  isSubmitting = false,
  serverError = null,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <BrandFormContent
        key={brand ? brand.id : "new"}
        brand={brand}
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        serverError={serverError}
      />
    </div>
  );
}


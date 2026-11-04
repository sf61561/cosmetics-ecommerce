"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaSave,
  FaDesktop,
  FaMobileAlt,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaEye,
} from "react-icons/fa";
import { heroSliderService } from "@/services/heroSliderService";

const EMPTY_FORM = {
  internalName: "",
  headline: "",
  subtitle: "",
  badgeText: "",
  buttonText: "",
  buttonLink: "",
  displayOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
  textAlignment: "left",
  textColor: "light",
  overlayOpacity: 0.4,
  textPosition: "center",
  altText: "",
  openInNewTab: false,
  placement: "home_hero",
};

function toLocalDateTime(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function getAlignment(alignment) {
  if (alignment === "center") return { items: "items-center", text: "text-center" };
  if (alignment === "right") return { items: "items-end", text: "text-right" };
  return { items: "items-start", text: "text-left" };
}

function getPosition(position) {
  if (position === "top") return "justify-start";
  if (position === "bottom") return "justify-end";
  return "justify-center";
}

export default function HeroSliderForm({ initialSlide = null }) {
  const router = useRouter();
  const [form, setForm] = useState(
    initialSlide
      ? {
          ...EMPTY_FORM,
          ...initialSlide,
          startsAt: toLocalDateTime(initialSlide.startsAt),
          endsAt: toLocalDateTime(initialSlide.endsAt),
        }
      : EMPTY_FORM
  );

  const [desktopImage, setDesktopImage] = useState(null);
  const [mobileImage, setMobileImage] = useState(null);
  const [previewMode, setPreviewMode] = useState("desktop"); // 'desktop' | 'mobile'
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const desktopPreview = useMemo(
    () => (desktopImage ? URL.createObjectURL(desktopImage) : form.desktopImageUrl),
    [desktopImage, form.desktopImageUrl]
  );

  const mobilePreview = useMemo(
    () =>
      mobileImage
        ? URL.createObjectURL(mobileImage)
        : form.mobileImageUrl || desktopPreview,
    [mobileImage, form.mobileImageUrl, desktopPreview]
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!initialSlide && !desktopImage) {
      setMessage({ type: "error", text: "Desktop banner image is required." });
      return;
    }
    if ((form.buttonText && !form.buttonLink) || (form.buttonLink && !form.buttonText)) {
      setMessage({ type: "error", text: "CTA button text and destination link must be provided together." });
      return;
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      setMessage({ type: "error", text: "Schedule end date must be after start date." });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        altText: form.altText || form.headline || form.internalName,
        desktopImage,
        mobileImage,
      };

      if (initialSlide) {
        await heroSliderService.update(initialSlide.id, payload);
      } else {
        await heroSliderService.create(payload);
      }

      router.push("/admin/hero-sliders");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm outline-none focus:border-[#9B4F5E] dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors";

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Top Bar */}
      <Link
        href="/admin/hero-sliders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#9B4F5E] hover:underline"
      >
        <FaArrowLeft /> Back to Sliders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Storefront</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {initialSlide ? `Edit Slide: ${initialSlide.internalName}` : "Create New Hero Slide"}
          </h1>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#9B4F5E] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#853F4D] disabled:opacity-60 transition-colors cursor-pointer"
        >
          <FaSave />
          {isSaving ? "Saving slide..." : "Save slide"}
        </button>
      </div>

      {/* Error / Feedback Banner */}
      {message && (
        <div
          role="alert"
          className={`rounded-xl border p-3.5 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Grid: Form Controls vs Live Preview */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column: Form Fields */}
        <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          {/* Section 1: Basic Slide Info */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              1. Slide Content & Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Internal Title (Admin reference) *
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Mega Sale Banner"
                  value={form.internalName}
                  onChange={(e) => setField("internalName", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Overlay Headline *
                <input
                  type="text"
                  required
                  placeholder="e.g. GLASS SKIN SECRETS"
                  value={form.headline}
                  onChange={(e) => setField("headline", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Badge / Tag Text (Optional)
                <input
                  type="text"
                  placeholder="e.g. Eloura Exclusive, 20% OFF"
                  value={form.badgeText}
                  onChange={(e) => setField("badgeText", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Alt Text (For accessibility & SEO) *
                <input
                  type="text"
                  placeholder="Describe the image for screen readers"
                  value={form.altText}
                  onChange={(e) => setField("altText", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
                Subtitle / Description
                <textarea
                  rows="2"
                  placeholder="e.g. Up to 30% OFF on Korean Sunscreens and Serums"
                  value={form.subtitle}
                  onChange={(e) => setField("subtitle", e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </div>

          {/* Section 2: Call to Action & Link Destination */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              2. CTA & Destination Link
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Button Text (Optional)
                <input
                  type="text"
                  placeholder="e.g. Shop Now, Explore"
                  value={form.buttonText}
                  onChange={(e) => setField("buttonText", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Destination Link URL
                <input
                  type="text"
                  placeholder="e.g. /shop, /collections/glass-skin"
                  value={form.buttonLink}
                  onChange={(e) => setField("buttonLink", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Open link in new tab</p>
                  <p className="text-[11px] text-gray-400">Useful if linking to external partners or campaigns</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(e) => setField("openInNewTab", e.target.checked)}
                  className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Image Assets Upload */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              3. Banner Image Assets
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Desktop Image */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Desktop Banner Image {!initialSlide && "*"}
                </label>
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50/30 dark:bg-gray-800/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
                    <FaInfoCircle className="text-[#9B4F5E]" />
                    <span>Recommended: <strong>1600 × 600 px</strong> (8:3 ratio)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required={!initialSlide}
                    onChange={(e) => setDesktopImage(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FBF0F0] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#9B4F5E] cursor-pointer"
                  />
                </div>
              </div>

              {/* Mobile Image */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Mobile Banner Image (Recommended)
                </label>
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-3 bg-gray-50/30 dark:bg-gray-800/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
                    <FaInfoCircle className="text-[#9B4F5E]" />
                    <span>Recommended: <strong>800 × 800 px</strong> or 800 × 1000 px</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setMobileImage(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FBF0F0] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#9B4F5E] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Typography, Overlay & Styling */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              4. Typography & Visual Overlay
            </h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Text Alignment
                <select
                  value={form.textAlignment}
                  onChange={(e) => setField("textAlignment", e.target.value)}
                  className={fieldClass}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Text Position
                <select
                  value={form.textPosition}
                  onChange={(e) => setField("textPosition", e.target.value)}
                  className={fieldClass}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Text Color
                <select
                  value={form.textColor}
                  onChange={(e) => setField("textColor", e.target.value)}
                  className={fieldClass}
                >
                  <option value="light">Light (White)</option>
                  <option value="dark">Dark (Gray/Black)</option>
                </select>
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Dark Overlay (0.0 - 1.0)
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.overlayOpacity}
                  onChange={(e) => setField("overlayOpacity", e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </div>

          {/* Section 5: Scheduling & Publication */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              5. Scheduling & Placement
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Placement
                <select
                  value={form.placement}
                  onChange={(e) => setField("placement", e.target.value)}
                  className={fieldClass}
                >
                  <option value="home_hero">Homepage Hero Banner</option>
                  <option value="home_promo">Homepage Promotional Strip</option>
                  <option value="collection_top">Collection Top Banner</option>
                </select>
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Start Date (Optional)
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setField("startsAt", e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                End Date (Optional)
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setField("endsAt", e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Active status</p>
                <p className="text-[11px] text-gray-400">Turn on to make visible on storefront within schedule</p>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="space-y-4">
          <div className="sticky top-20 rounded-3xl border border-gray-200 bg-white p-5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaEye className="text-[#9B4F5E]" />
                Live Preview
              </h3>

              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    previewMode === "desktop"
                      ? "bg-white text-gray-900 shadow-2xs dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                  }`}
                >
                  <FaDesktop className="h-3 w-3" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    previewMode === "mobile"
                      ? "bg-white text-gray-900 shadow-2xs dark:bg-gray-700 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                  }`}
                >
                  <FaMobileAlt className="h-3 w-3" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div
              className={`relative overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 transition-all duration-300 ${
                previewMode === "desktop" ? "aspect-[16/7] w-full" : "aspect-square w-3/4 mx-auto"
              }`}
            >
              {previewMode === "desktop" ? (
                desktopPreview ? (
                  <Image
                    src={desktopPreview}
                    alt={form.altText || form.headline}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                    unoptimized={Boolean(desktopImage)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    Upload desktop image to preview
                  </div>
                )
              ) : mobilePreview ? (
                <Image
                  src={mobilePreview}
                  alt={form.altText || form.headline}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                  unoptimized={Boolean(mobileImage || desktopImage)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  Upload mobile image to preview
                </div>
              )}

              {/* Text Overlay Simulation */}
              <div
                className={`absolute inset-0 flex flex-col ${getPosition(form.textPosition)} ${
                  getAlignment(form.textAlignment).items
                } p-5 ${getAlignment(form.textAlignment).text} ${
                  form.textColor === "dark" ? "text-gray-900" : "text-white"
                }`}
                style={{ backgroundColor: `rgba(0,0,0,${form.overlayOpacity})` }}
              >
                {form.badgeText && (
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-90">
                    {form.badgeText}
                  </span>
                )}
                <h4 className="mt-1 text-lg sm:text-xl font-bold leading-tight">
                  {form.headline || "Your Headline Here"}
                </h4>
                {form.subtitle && (
                  <p className="mt-1 whitespace-pre-line text-xs max-w-sm opacity-90">
                    {form.subtitle}
                  </p>
                )}
                {form.buttonText && (
                  <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-[#9B4F5E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs">
                    {form.buttonText}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-gray-400 text-center">
              {previewMode === "desktop"
                ? "Simulating 1600 × 600 widescreen hero banner."
                : "Simulating responsive 800 × 800 mobile screen banner."}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

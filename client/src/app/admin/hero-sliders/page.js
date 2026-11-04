"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaTrash,
  FaCopy,
  FaGripVertical,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
} from "react-icons/fa";
import { heroSliderService } from "@/services/heroSliderService";
import Pagination from "@/components/admin/Pagination";

export default function AdminHeroSlidersPage() {
  const [slides, setSlides] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [placement, setPlacement] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [message, setMessage] = useState(null);
  const [deleteConfirmSlide, setDeleteConfirmSlide] = useState(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await heroSliderService.list({
        limit: 50,
        search,
        status,
        placement: placement === "all" ? undefined : placement,
      });
      setSlides(response.data || []);
      setSummary(response.summary || {});
    } catch (error) {
      setMessage({
        type: "error",
        text: error.status === 401
          ? "Your admin session has expired. Please sign in again to manage hero sliders."
          : error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, status, placement]);

  const toggle = async (slide) => {
    // Optimistic UI update
    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, isActive: !s.isActive } : s))
    );
    try {
      await heroSliderService.updateStatus(slide.id, !slide.isActive);
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      await load();
    }
  };

  const handleDuplicate = async (slide) => {
    try {
      setMessage({ type: "info", text: `Duplicating "${slide.internalName}"...` });
      await heroSliderService.duplicate(slide.id);
      setMessage({ type: "success", text: `Slide "${slide.internalName}" duplicated successfully.` });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmSlide) return;
    try {
      await heroSliderService.remove(deleteConfirmSlide.id);
      setMessage({ type: "success", text: `Deleted slide "${deleteConfirmSlide.internalName}".` });
      setDeleteConfirmSlide(null);
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlides(reordered);
    await saveOrder(reordered);
  };

  const saveOrder = async (orderedSlides) => {
    setIsReordering(true);
    try {
      await heroSliderService.reorder(
        orderedSlides.map((slide, order) => ({ id: slide.id, position: order, displayOrder: order }))
      );
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsReordering(false);
    }
  };

  // HTML5 Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const reordered = [...slides];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedItem);

    setSlides(reordered);
    setDraggedIndex(null);
    await saveOrder(reordered);
  };

  const getStatusBadge = (slide) => {
    const now = Date.now();
    const isScheduled = slide.startsAt && new Date(slide.startsAt).getTime() > now;
    const isExpired = slide.endsAt && new Date(slide.endsAt).getTime() <= now;

    if (!slide.isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Draft / Inactive
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-400">
          Expired
        </span>
      );
    }
    if (isScheduled) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <FaCalendarAlt className="h-3 w-3" />
          Scheduled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        <FaCheckCircle className="h-3 w-3" />
        Live on Store
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Storefront</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Slider Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add, reorder via drag-and-drop, schedule, and publish homepage banners.
          </p>
        </div>
        <Link
          href="/admin/hero-sliders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#9B4F5E] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#853F4D] transition-colors"
        >
          <FaPlus /> Add New Slide
        </Link>
      </header>

      {/* Feedback Message */}
      {message && (
        <div
          role="alert"
          className={`rounded-xl border p-3 text-sm flex items-center justify-between ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : message.type === "info"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Slides", summary.total ?? 0, "All catalog banners"],
          ["Live on Store", summary.displayed ?? 0, "Visible right now"],
          ["Scheduled", summary.scheduled ?? 0, "Upcoming start date"],
          ["Expired", summary.expired ?? 0, "Past end date"],
        ].map(([label, value, hint]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-900 shadow-2xs">
        {/* Search */}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title, headline or label..."
          className="w-full sm:max-w-xs rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#9B4F5E] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ["all", "All"],
            ["active", "Live"],
            ["scheduled", "Scheduled"],
            ["expired", "Expired"],
            ["inactive", "Inactive"],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setStatus(val);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                status === val
                  ? "bg-[#9B4F5E] text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Slides Table with Drag and Drop Reordering */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">Order</th>
                <th className="px-4 py-3.5">Banner Image</th>
                <th className="px-4 py-3.5">Title & Destination</th>
                <th className="px-4 py-3.5">Schedule</th>
                <th className="px-4 py-3.5">Visibility</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                    <p className="mt-2 text-xs">Loading hero slides...</p>
                  </td>
                </tr>
              ) : slides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-gray-400">
                    No hero slides match your current filter.
                  </td>
                </tr>
              ) : (
                slides
                  .slice((page - 1) * limit, page * limit)
                  .map((slide, pIndex) => {
                    const index = (page - 1) * limit + pIndex;
                    const isBeingDragged = draggedIndex === index;
                    const isOver = dragOverIndex === index;

                  return (
                    <tr
                      key={slide.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`transition-colors ${
                        isBeingDragged
                          ? "opacity-30 bg-pink-50 dark:bg-pink-950/20"
                          : isOver
                          ? "border-t-2 border-[#9B4F5E] bg-pink-50/50 dark:bg-pink-950/30"
                          : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      {/* Drag Handle & Order */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing p-1"
                            title="Drag to reorder"
                          >
                            <FaGripVertical className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-bold text-gray-500 w-4">
                            {index + 1}
                          </span>
                        </div>
                        {/* Accessible Up / Down Buttons */}
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <button
                            type="button"
                            disabled={index === 0 || isReordering}
                            onClick={() => move(index, -1)}
                            title="Move Up"
                            className="p-0.5 text-gray-400 hover:text-[#9B4F5E] disabled:opacity-20 cursor-pointer"
                          >
                            <FaArrowUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === slides.length - 1 || isReordering}
                            onClick={() => move(index, 1)}
                            title="Move Down"
                            className="p-0.5 text-gray-400 hover:text-[#9B4F5E] disabled:opacity-20 cursor-pointer"
                          >
                            <FaArrowDown className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Banner Image Preview */}
                      <td className="px-4 py-3">
                        <div className="relative h-14 w-28 overflow-hidden rounded-xl bg-gray-100 shadow-2xs border border-gray-200 dark:border-gray-800">
                          {slide.desktopImageUrl ? (
                            <Image
                              src={slide.desktopImageUrl}
                              alt={slide.altText || slide.headline}
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                              No image
                            </div>
                          )}
                          {slide.mobileImageUrl && (
                            <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.2 text-[9px] font-bold text-white">
                              +Mobile
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title & Link */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {slide.internalName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {slide.headline}
                        </p>
                        {slide.buttonLink && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#9B4F5E]">
                            <FaExternalLinkAlt className="h-2.5 w-2.5" />
                            <span className="truncate max-w-xs">{slide.buttonLink}</span>
                            {slide.openInNewTab && (
                              <span className="text-[10px] text-gray-400">(new tab)</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Schedule & Status Badge */}
                      <td className="px-4 py-3">
                        <div>{getStatusBadge(slide)}</div>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {slide.startsAt ? new Date(slide.startsAt).toLocaleDateString() : "Immediate"}
                          {slide.endsAt ? ` → ${new Date(slide.endsAt).toLocaleDateString()}` : " (No expiry)"}
                        </p>
                      </td>

                      {/* Active Toggle Switch */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(slide)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            slide.isActive ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                          aria-label={`Toggle active status for ${slide.internalName}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              slide.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/hero-sliders/${slide.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#9B4F5E] transition-colors"
                            title="Edit Slide"
                          >
                            <FaEdit className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(slide)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Duplicate Slide"
                          >
                            <FaCopy className="h-3.5 w-3.5" />
                          </button>

                          <a
                            href={slide.desktopImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                            title="Preview Full Image"
                          >
                            <FaEye className="h-3.5 w-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSlide(slide)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Slide"
                          >
                            <FaTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination ── */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(slides.length / limit) || 1}
          totalItems={slides.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          itemLabel="hero slides"
          isLoading={isLoading}
          variant="attached"
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Hero Slide?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-800 dark:text-gray-200">"{deleteConfirmSlide.internalName}"</span>? The associated banner assets will be removed from Cloudinary. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmSlide(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 cursor-pointer"
              >
                Delete Slide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

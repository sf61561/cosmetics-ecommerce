"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaTag,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaEdit,
  FaTrashAlt,
  FaBoxOpen,
  FaCheck,
} from "react-icons/fa";
import { tagService } from "@/services/tagService";
import Pagination from "@/components/admin/Pagination";
import TagFormModal from "@/components/admin/tags/TagFormModal";

export default function AdminTagsPage() {
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await tagService.getAdminTags({
        search,
        page,
        limit,
      });
      setTags(res.tags || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || "Failed to load tags.");
    } finally {
      setIsLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tag) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingTag) {
      await tagService.updateAdminTag(editingTag.id, formData);
      showToast(`Tag "${formData.name}" updated successfully.`);
    } else {
      await tagService.createAdminTag(formData);
      showToast(`Tag "${formData.name}" created successfully.`);
    }
    loadTags();
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Are you sure you want to delete tag "${tag.name}"?`)) return;
    try {
      await tagService.deleteAdminTag(tag.id);
      showToast(`Tag "${tag.name}" deleted successfully.`);
      loadTags();
    } catch (err) {
      alert(err.message || "Failed to delete tag.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <FaCheck className="text-xs" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Tags
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-[#9B4F5E] dark:text-rose-300">
              {pagination.total} Tags
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and organize product tags, badges (e.g. Cruelty-Free, Vegan, Best Seller), and search keywords.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadTags}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh tags"
          >
            <FaSyncAlt className={`text-xs ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9B4F5E] hover:bg-[#843F4E] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <FaPlus className="text-xs" />
            <span>Add Tag</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar: Search ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search tags by name, slug or description..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#9B4F5E]"
          />
        </div>

        <span className="text-xs text-gray-400">
          Showing {tags.length} of {pagination.total} tags
        </span>
      </div>

      {/* ── Tags Table ── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xs overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs border-b border-red-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tag Badge</th>
                <th className="py-3 px-4">Tag Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <FaTag className="mx-auto text-3xl mb-2 text-gray-300 dark:text-gray-700" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                      No tags found
                    </p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">
                      {search
                        ? "Try searching with a different term."
                        : "Start organizing your catalog by adding your first product tag."}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9B4F5E] text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <FaPlus className="text-xs" />
                      <span>Add Tag</span>
                    </button>
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Tag Badge Preview */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-[#9B4F5E] dark:text-rose-300 border border-rose-200/80 dark:border-rose-900 shadow-2xs">
                        <FaTag className="text-[9px]" />
                        <span>{tag.name}</span>
                      </span>
                    </td>

                    {/* Tag Name */}
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {tag.name}
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      #{tag.slug}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={tag.description || ""}>
                      {tag.description || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* Associated Products */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {tag.productCount || 0}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(tag.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tag)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#9B4F5E] hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors cursor-pointer"
                          title="Edit Tag"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete Tag"
                        >
                          <FaTrashAlt className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Create / Edit Tag Modal ── */}
      <TagFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tag={editingTag}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}


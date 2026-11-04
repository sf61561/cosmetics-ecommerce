"use client";

import { useState, useEffect } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { collectionService } from "@/services/collectionService";
import Pagination from "@/components/admin/Pagination";
import CollectionsSummaryCards from "@/components/admin/collections/CollectionsSummaryCards";
import CollectionsTable from "@/components/admin/collections/CollectionsTable";
import CollectionFormModal from "@/components/admin/collections/CollectionFormModal";
import ViewCollectionModal from "@/components/admin/collections/ViewCollectionModal";
import DeleteCollectionDialog from "@/components/admin/collections/DeleteCollectionDialog";

export default function AdminCollectionsPage() {
  // Collections list state
  const [collections, setCollections] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters, sorting, and refresh trigger
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState(null);

  const [viewingCollection, setViewingCollection] = useState(null);
  const [deletingCollection, setDeletingCollection] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch collections inside useEffect with cleanup to avoid cascading renders
  useEffect(() => {
    let isSubscribed = true;

    async function fetchCollections() {
      try {
        const res = await collectionService.getCollections({
          search,
          status: statusFilter,
          page,
          limit,
          sortBy,
          sortOrder,
        });

        if (isSubscribed && res && res.success) {
          setCollections(res.data || []);
          setError(null);
          if (res.pagination) {
            setPagination(res.pagination);
          }
          if (res.summary) {
            setSummary(res.summary);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Error fetching collections:", err);
          setError(
            err.message || "Failed to load collections. Please check your network connection."
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchCollections();

    return () => {
      isSubscribed = false;
    };
  }, [search, statusFilter, page, limit, sortBy, sortOrder, refreshKey]);

  // Handle Create / Edit Submission
  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setFormServerError(null);

      if (editingCollection) {
        const res = await collectionService.updateCollection(editingCollection.id, formData);
        showToast(res.message || "Collection updated successfully!", "success");
      } else {
        const res = await collectionService.createCollection(formData);
        showToast(res.message || "Collection created successfully!", "success");
      }

      setIsFormOpen(false);
      setEditingCollection(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Collection form submission error:", err);
      setFormServerError({
        message: err.message || "Failed to save collection.",
        field: err.field,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (collection) => {
    try {
      const newStatus = !collection.isActive;
      await collectionService.updateCollection(collection.id, {
        isActive: newStatus,
      });

      showToast(
        `Collection "${collection.name}" is now ${newStatus ? "Active" : "Inactive"}.`,
        "success"
      );
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Toggle status error:", err);
      showToast(err.message || "Failed to update collection status.", "error");
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async (id) => {
    try {
      setIsDeleting(true);
      const res = await collectionService.deleteCollection(id);
      showToast(res.message || "Collection deleted successfully.", "success");
      setDeletingCollection(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete collection error:", err);
      showToast(err.message || "Failed to delete collection.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Deactivate Instead (for collections with products)
  const handleDeactivateInstead = async (collection) => {
    try {
      setIsDeleting(true);
      await collectionService.updateCollection(collection.id, {
        isActive: false,
      });
      showToast(`Collection "${collection.name}" deactivated successfully.`, "success");
      setDeletingCollection(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Deactivate collection error:", err);
      showToast(err.message || "Failed to deactivate collection.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter change handlers
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    setIsLoading(true);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
    setIsLoading(true);
  };

  // Sort handler
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(columnKey);
      setSortOrder("DESC");
    }
    setPage(1);
    setIsLoading(true);
  };

  return (
    <div className="space-y-6">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-white dark:bg-gray-900 px-4 py-3 shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4 duration-200">
          {toast.type === "success" ? (
            <FaCheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <FaExclamationCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <FaTimes className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
            Collections
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm mt-1">
            Organize and manage your store collections.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCollection(null);
            setFormServerError(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#9B4F5E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer shrink-0"
        >
          <FaPlus className="h-3 w-3" />
          Add Collection
        </button>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <CollectionsSummaryCards summary={summary} isLoading={isLoading} />

      {/* ─── FILTER AND SEARCH TOOLBAR ─── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All", count: summary.total },
            { id: "active", label: "Active", count: summary.active },
            { id: "inactive", label: "Inactive", count: summary.inactive },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusFilterChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#9B4F5E] text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-3.5 w-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search collections..."
              className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 py-1.5 pl-9 pr-8 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#9B4F5E] focus:bg-white dark:focus:bg-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#9B4F5E]/15 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <FaTimes className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split("-");
                setSortBy(col);
                setSortOrder(ord);
                setPage(1);
                setIsLoading(true);
              }}
              className="rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 py-1.5 px-3 text-xs font-medium text-gray-700 dark:text-gray-200 focus:border-[#9B4F5E] focus:bg-white dark:focus:bg-gray-900 focus:outline-hidden cursor-pointer"
            >
              <option value="created_at-DESC">Newest First</option>
              <option value="created_at-ASC">Oldest First</option>
              <option value="name-ASC">Name (A-Z)</option>
              <option value="name-DESC">Name (Z-A)</option>
              <option value="product_count-DESC">Most Products</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── COLLECTIONS TABLE / CARDS ─── */}
      <CollectionsTable
        collections={collections}
        isLoading={isLoading}
        error={error}
        onRetry={() => {
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }}
        onView={(col) => setViewingCollection(col)}
        onEdit={(col) => {
          setEditingCollection(col);
          setFormServerError(null);
          setIsFormOpen(true);
        }}
        onDelete={(col) => setDeletingCollection(col)}
        onToggleStatus={handleToggleStatus}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* ─── PAGINATION BAR ─── */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={limit}
        onPageChange={(p) => {
          setPage(p);
          setIsLoading(true);
        }}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
          setIsLoading(true);
        }}
        itemLabel="collections"
        isLoading={isLoading}
        variant="card"
      />

      {/* ─── ADD / EDIT MODAL ─── */}
      <CollectionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCollection(null);
          setFormServerError(null);
        }}
        onSubmit={handleFormSubmit}
        collection={editingCollection}
        isSubmitting={isSubmitting}
        serverError={formServerError}
      />

      {/* ─── VIEW MODAL ─── */}
      <ViewCollectionModal
        isOpen={Boolean(viewingCollection)}
        onClose={() => setViewingCollection(null)}
        collection={viewingCollection}
        onEdit={(col) => {
          setViewingCollection(null);
          setEditingCollection(col);
          setFormServerError(null);
          setIsFormOpen(true);
        }}
      />

      {/* ─── DELETE DIALOG ─── */}
      <DeleteCollectionDialog
        isOpen={Boolean(deletingCollection)}
        onClose={() => setDeletingCollection(null)}
        onConfirmDelete={handleConfirmDelete}
        onDeactivateInstead={handleDeactivateInstead}
        collection={deletingCollection}
        isDeleting={isDeleting}
      />
    </div>
  );
}

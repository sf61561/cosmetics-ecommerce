"use client";

import { useState, useEffect } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { brandService } from "@/services/brandService";
import Pagination from "@/components/admin/Pagination";
import BrandsSummaryCards from "@/components/admin/brands/BrandsSummaryCards";
import BrandsTable from "@/components/admin/brands/BrandsTable";
import BrandFormModal from "@/components/admin/brands/BrandFormModal";
import ViewBrandModal from "@/components/admin/brands/ViewBrandModal";
import DeleteBrandDialog from "@/components/admin/brands/DeleteBrandDialog";

export default function AdminBrandsPage() {
  // Brands list state
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    featured: 0,
    totalProducts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters, sorting, and refresh trigger
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive' | 'featured'
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState(null);

  const [viewingBrand, setViewingBrand] = useState(null);
  const [deletingBrand, setDeletingBrand] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch brands inside useEffect with cleanup
  useEffect(() => {
    let isSubscribed = true;

    async function fetchBrands() {
      try {
        const queryParams = {
          search,
          page,
          limit,
          sortBy,
          sortOrder,
        };

        if (statusFilter === "featured") {
          queryParams.isFeatured = "true";
          queryParams.status = "all";
        } else {
          queryParams.status = statusFilter;
          queryParams.isFeatured = "all";
        }

        const res = await brandService.getBrands(queryParams);

        if (isSubscribed && res && res.success) {
          setBrands(res.data || []);
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
          console.error("Error fetching brands:", err);
          setError(
            err.message || "Failed to load brands. Please check your network connection."
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchBrands();

    return () => {
      isSubscribed = false;
    };
  }, [search, statusFilter, page, limit, sortBy, sortOrder, refreshKey]);

  // Handle Create / Edit Submission
  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setFormServerError(null);

      if (editingBrand) {
        const res = await brandService.updateBrand(editingBrand.id, formData);
        showToast(res.message || "Brand updated successfully!", "success");
      } else {
        const res = await brandService.createBrand(formData);
        showToast(res.message || "Brand registered successfully!", "success");
      }

      setIsFormOpen(false);
      setEditingBrand(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Brand form submission error:", err);
      setFormServerError({
        message: err.message || "Failed to save brand.",
        field: err.field,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (brand) => {
    try {
      const newStatus = !brand.isActive;
      await brandService.updateBrand(brand.id, {
        isActive: newStatus,
      });

      showToast(
        `Brand "${brand.name}" is now ${newStatus ? "Active" : "Inactive"}.`,
        "success"
      );
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Toggle brand status error:", err);
      showToast(err.message || "Failed to update brand status.", "error");
    }
  };

  // Handle Quick Featured Toggle
  const handleToggleFeatured = async (brand) => {
    try {
      const newFeatured = !brand.isFeatured;
      await brandService.updateBrand(brand.id, {
        isFeatured: newFeatured,
      });

      showToast(
        `Brand "${brand.name}" is ${newFeatured ? "now marked as featured" : "no longer marked as featured"}.`,
        "success"
      );
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Toggle brand featured error:", err);
      showToast(err.message || "Failed to update featured status.", "error");
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async (id) => {
    try {
      setIsDeleting(true);
      const res = await brandService.deleteBrand(id);
      showToast(res.message || "Brand deleted successfully.", "success");
      setDeletingBrand(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete brand error:", err);
      showToast(err.message || "Failed to delete brand.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Deactivate Instead (for brands with products)
  const handleDeactivateInstead = async (brand) => {
    try {
      setIsDeleting(true);
      await brandService.updateBrand(brand.id, {
        isActive: false,
      });
      showToast(`Brand "${brand.name}" deactivated successfully.`, "success");
      setDeletingBrand(null);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Deactivate brand error:", err);
      showToast(err.message || "Failed to deactivate brand.", "error");
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
            Brands
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm mt-1">
            Manage your store beauty brands, official partners, and homepage highlights.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingBrand(null);
            setFormServerError(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#9B4F5E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer shrink-0"
        >
          <FaPlus className="h-3 w-3" />
          Add Brand
        </button>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <BrandsSummaryCards summary={summary} isLoading={isLoading} />

      {/* ─── FILTER AND SEARCH TOOLBAR ─── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "all", label: "All", count: summary.total },
            { id: "active", label: "Active", count: summary.active },
            { id: "inactive", label: "Inactive", count: summary.inactive },
            { id: "featured", label: "Featured", count: summary.featured },
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
              placeholder="Search brands..."
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

      {/* ─── BRANDS TABLE / CARDS ─── */}
      <BrandsTable
        brands={brands}
        isLoading={isLoading}
        error={error}
        onRetry={() => {
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }}
        onView={(b) => setViewingBrand(b)}
        onEdit={(b) => {
          setEditingBrand(b);
          setFormServerError(null);
          setIsFormOpen(true);
        }}
        onDelete={(b) => setDeletingBrand(b)}
        onToggleStatus={handleToggleStatus}
        onToggleFeatured={handleToggleFeatured}
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
        itemLabel="brands"
        isLoading={isLoading}
        variant="card"
      />

      {/* ─── ADD / EDIT MODAL ─── */}
      <BrandFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBrand(null);
          setFormServerError(null);
        }}
        onSubmit={handleFormSubmit}
        brand={editingBrand}
        isSubmitting={isSubmitting}
        serverError={formServerError}
      />

      {/* ─── VIEW MODAL ─── */}
      <ViewBrandModal
        isOpen={Boolean(viewingBrand)}
        onClose={() => setViewingBrand(null)}
        brand={viewingBrand}
        onEdit={(b) => {
          setViewingBrand(null);
          setEditingBrand(b);
          setFormServerError(null);
          setIsFormOpen(true);
        }}
      />

      {/* ─── DELETE DIALOG ─── */}
      <DeleteBrandDialog
        isOpen={Boolean(deletingBrand)}
        onClose={() => setDeletingBrand(null)}
        onConfirmDelete={handleConfirmDelete}
        onDeactivateInstead={handleDeactivateInstead}
        brand={deletingBrand}
        isDeleting={isDeleting}
      />
    </div>
  );
}


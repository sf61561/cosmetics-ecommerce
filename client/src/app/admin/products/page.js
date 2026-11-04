"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaPlus, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { productService } from "@/services/productService";
import Pagination from "@/components/admin/Pagination";
import ProductsSummaryCards from "@/components/admin/products/ProductsSummaryCards";
import ProductFilters from "@/components/admin/products/ProductFilters";
import ProductsTable from "@/components/admin/products/ProductsTable";
import ViewProductModal from "@/components/admin/products/ViewProductModal";
import DeleteProductDialog from "@/components/admin/products/DeleteProductDialog";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0,
    lowStock: 0,
    outOfStock: 0,
    totalInventoryValue: 0,
  });
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [brandId, setBrandId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load dropdown metadata (brands & categories)
  useEffect(() => {
    let isSubscribed = true;
    async function loadMeta() {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          productService.getCategories(),
          productService.getBrands(),
        ]);
        if (isSubscribed) {
          if (catsRes?.success) setCategories(catsRes.data || []);
          if (brandsRes?.success) setBrands(brandsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load product metadata:", err);
      }
    }
    loadMeta();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Fetch products inside useEffect with cleanup to prevent cascading renders
  useEffect(() => {
    let isSubscribed = true;

    async function fetchProducts() {
      try {
        const res = await productService.getAdminProducts({
          search,
          status,
          brandId,
          categoryId,
          stockStatus,
          page,
          limit,
          sortBy,
          sortOrder,
        });

        if (isSubscribed && res && res.success) {
          setProducts(res.data || []);
          if (res.pagination) setPagination(res.pagination);
          if (res.summary) setSummary(res.summary);
          setError(null);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Error fetching products:", err);
          setError(err.message || "Failed to load products. Please check connection.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isSubscribed = false;
    };
  }, [search, status, brandId, categoryId, stockStatus, page, limit, sortBy, sortOrder, refreshKey]);

  // Handle Quick Status Change
  const handleStatusChange = async (productId, newStatus) => {
    try {
      await productService.updateProductStatus(productId, newStatus);
      showToast(`Product status updated to ${newStatus}`);
      setIsLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  // Handle Product Deletion
  const handleConfirmDelete = async (product) => {
    setIsDeleting(true);
    try {
      await productService.deleteProduct(product.id);
      showToast(`Product '${product.name}' was permanently deleted`);
      setDeletingProduct(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err.message || "Failed to delete product", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Archive instead of delete
  const handleArchiveInstead = async (product) => {
    try {
      await productService.updateProductStatus(product.id, "ARCHIVED");
      showToast(`Product '${product.name}' has been archived.`);
      setDeletingProduct(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err.message || "Failed to archive product", "error");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setBrandId("all");
    setCategoryId("all");
    setStockStatus("all");
    setSortBy("created_at");
    setSortOrder("DESC");
    setPage(1);
    setLimit(10);
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-semibold shadow-xl transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <FaExclamationCircle className="h-4 w-4 shrink-0" />
          ) : (
            <FaCheckCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Manage your cosmetics catalog, stock levels, formulation details, and pricing.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="flex items-center justify-center gap-2 rounded-full bg-[#9B4F5E] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-all cursor-pointer self-start sm:self-auto"
        >
          <FaPlus className="h-3 w-3" />
          Add Product
        </Link>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <ProductsSummaryCards summary={summary} isLoading={isLoading && products.length === 0} />

      {/* ── Filters & Search ── */}
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
        <ProductFilters
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={(s) => {
            setStatus(s);
            setPage(1);
          }}
          brandId={brandId}
          setBrandId={(b) => {
            setBrandId(b);
            setPage(1);
          }}
          categoryId={categoryId}
          setCategoryId={(c) => {
            setCategoryId(c);
            setPage(1);
          }}
          stockStatus={stockStatus}
          setStockStatus={(st) => {
            setStockStatus(st);
            setPage(1);
          }}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          brands={brands}
          categories={categories}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── Products Table ── */}
      <ProductsTable
        products={products}
        isLoading={isLoading}
        error={error}
        onView={(p) => setViewingProduct(p)}
        onDelete={(p) => setDeletingProduct(p)}
        onStatusChange={handleStatusChange}
        onRetry={() => {
          setIsLoading(true);
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* ── Pagination Controls ── */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        itemLabel="products"
        isLoading={isLoading}
        variant="card"
      />

      {/* ── View Product Modal ── */}
      <ViewProductModal
        isOpen={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <DeleteProductDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirmDelete={handleConfirmDelete}
        onArchiveInstead={handleArchiveInstead}
        product={deletingProduct}
        isDeleting={isDeleting}
      />
    </div>
  );
}

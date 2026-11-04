"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaFileExport, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { customerService } from "@/services/customerService";
import Pagination from "@/components/admin/Pagination";
import CustomersSummaryCards from "@/components/admin/customers/CustomersSummaryCards";
import CustomerFilters from "@/components/admin/customers/CustomerFilters";
import CustomersTable from "@/components/admin/customers/CustomersTable";
import EditCustomerModal from "@/components/admin/customers/EditCustomerModal";
import BlockCustomerDialog from "@/components/admin/customers/BlockCustomerDialog";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    customersWithOrders: 0,
    newCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [hasOrders, setHasOrders] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [statusTargetCustomer, setStatusTargetCustomer] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch customers data
  useEffect(() => {
    let isSubscribed = true;

    async function loadCustomers() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await customerService.getCustomers({
          search,
          status,
          hasOrders,
          startDate,
          endDate,
          sortBy,
          sortOrder,
          page,
          limit,
        });

        if (isSubscribed && res?.success) {
          setCustomers(res.data || []);
          if (res.pagination) {
            setPagination({
              ...res.pagination,
              page: res.pagination.currentPage,
            });
          }
          if (res.summary) {
            setSummary(res.summary);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Failed to fetch customers:", err);
          setError(err.message || "Failed to load customers list.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      isSubscribed = false;
    };
  }, [search, status, hasOrders, startDate, endDate, sortBy, sortOrder, page, limit, refreshKey]);

  // Handle Edit profile
  const handleSaveProfile = async (id, updatedFields) => {
    await customerService.updateCustomerProfile(id, updatedFields);
    showToast("Customer profile updated successfully.");
    setRefreshKey((k) => k + 1);
  };

  // Handle Block / Unblock
  const handleConfirmStatus = async (id, newStatus) => {
    await customerService.updateCustomerStatus(id, newStatus);
    showToast(
      `Customer account has been ${newStatus === "BLOCKED" ? "blocked" : "unblocked"} successfully.`,
      newStatus === "BLOCKED" ? "error" : "success"
    );
    setRefreshKey((k) => k + 1);
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await customerService.exportCsv({
        search,
        status,
        hasOrders,
        startDate,
        endDate,
      });
      showToast("Customers CSV downloaded successfully.");
    } catch (err) {
      showToast(err.message || "Failed to export customers CSV.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setHasOrders("all");
    setStartDate("");
    setEndDate("");
    setSortBy("created_at");
    setSortOrder("DESC");
    setPage(1);
    setLimit(10);
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Notification Banner ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
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
          {/* Breadcrumb */}
          <nav className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1.5 mb-1.5">
            <Link href="/admin" className="hover:text-[#9B4F5E] dark:hover:text-pink-300">
              Admin
            </Link>
            <span>/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">Customers</span>
          </nav>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage customer accounts, profiles, and order activity.
          </p>
        </div>

        {/* Header Action: Export CSV */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FaFileExport className="h-3.5 w-3.5 text-[#9B4F5E] dark:text-pink-300" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <CustomersSummaryCards summary={summary} isLoading={isLoading && customers.length === 0} />

      {/* ── Search & Filters Toolbar ── */}
      <CustomerFilters
        search={search}
        setSearch={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        setStatus={(val) => {
          setStatus(val);
          setPage(1);
        }}
        hasOrders={hasOrders}
        setHasOrders={(val) => {
          setHasOrders(val);
          setPage(1);
        }}
        startDate={startDate}
        setStartDate={(val) => {
          setStartDate(val);
          setPage(1);
        }}
        endDate={endDate}
        setEndDate={(val) => {
          setEndDate(val);
          setPage(1);
        }}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onReset={handleResetFilters}
      />

      {/* ── Customers Table ── */}
      <CustomersTable
        customers={customers}
        isLoading={isLoading}
        error={error}
        onEdit={(cust) => setEditingCustomer(cust)}
        onToggleStatus={(cust) => setStatusTargetCustomer(cust)}
        onRetry={() => setRefreshKey((k) => k + 1)}
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
        itemLabel="customer accounts"
        isLoading={isLoading}
        variant="card"
      />

      {/* ── Edit Customer Modal ── */}
      <EditCustomerModal
        isOpen={Boolean(editingCustomer)}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={handleSaveProfile}
      />

      {/* ── Block / Unblock Customer Dialog ── */}
      <BlockCustomerDialog
        isOpen={Boolean(statusTargetCustomer)}
        customer={statusTargetCustomer}
        onClose={() => setStatusTargetCustomer(null)}
        onConfirm={handleConfirmStatus}
      />
    </div>
  );
}

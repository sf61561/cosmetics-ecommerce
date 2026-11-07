"use client";

import { useState, useEffect, useCallback } from "react";
import { FaStar, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { reviewService } from "@/services/reviewService";
import Pagination from "@/components/admin/Pagination";
import ReviewsSummaryCards from "@/components/admin/reviews/ReviewsSummaryCards";
import ReviewsFilterBar from "@/components/admin/reviews/ReviewsFilterBar";
import ReviewsTable from "@/components/admin/reviews/ReviewsTable";
import ReviewDetailModal from "@/components/admin/reviews/ReviewDetailModal";
import RejectReviewModal from "@/components/admin/reviews/RejectReviewModal";
import DeleteReviewModal from "@/components/admin/reviews/DeleteReviewModal";
import ReviewLightboxModal from "@/components/admin/reviews/ReviewLightboxModal";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalItems: 0,
    totalPages: 1,
  });
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Modals state
  const [detailReview, setDetailReview] = useState(null);
  const [rejectingReview, setRejectingReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Dispatch badge update event
  const notifyBadgeUpdate = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("eloura:reviews-updated"));
    }
  };

  // Load KPI Metrics
  const loadMetrics = useCallback(async () => {
    try {
      setIsMetricsLoading(true);
      const data = await reviewService.getAdminMetrics();
      if (data) {
        setMetrics({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load review metrics:", err);
    } finally {
      setIsMetricsLoading(false);
    }
  }, []);

  // Load Reviews List
  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await reviewService.getAdminReviews({
        page,
        limit,
        status,
        rating,
        search,
        dateFrom,
        dateTo,
      });

      if (res) {
        setReviews(res.reviews || []);
        setPagination({
          page: res.page || 1,
          limit: res.limit || 15,
          totalItems: res.total || 0,
          totalPages: res.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setError(err.message || "Failed to load reviews.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, status, rating, search, dateFrom, dateTo]);

  // Initial load and filter change
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Handle single review approve
  const handleApprove = async (reviewId) => {
    try {
      setIsSubmittingAction(true);
      await reviewService.approveReview(reviewId);
      showToast("Review approved and published to product page.");
      notifyBadgeUpdate();
      // If modal was open for this review, update or close it
      if (detailReview && detailReview.id === reviewId) {
        setDetailReview((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
      setSelectedIds((prev) => prev.filter((id) => id !== reviewId));
      loadReviews();
      loadMetrics();
    } catch (err) {
      showToast(err.message || "Failed to approve review.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle single review reject
  const handleConfirmReject = async (reviewId, reason) => {
    try {
      setIsSubmittingAction(true);
      await reviewService.rejectReview(reviewId, reason);
      showToast("Review rejected. Customer has been notified.");
      notifyBadgeUpdate();
      setRejectingReview(null);
      if (detailReview && detailReview.id === reviewId) {
        setDetailReview((prev) =>
          prev ? { ...prev, status: "rejected", rejection_reason: reason } : null
        );
      }
      setSelectedIds((prev) => prev.filter((id) => id !== reviewId));
      loadReviews();
      loadMetrics();
    } catch (err) {
      showToast(err.message || "Failed to reject review.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle single review delete
  const handleConfirmDelete = async (reviewId) => {
    try {
      setIsSubmittingAction(true);
      await reviewService.deleteReview(reviewId);
      showToast("Review deleted and product ratings recalculated.");
      notifyBadgeUpdate();
      setDeletingReview(null);
      if (detailReview && detailReview.id === reviewId) {
        setDetailReview(null);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== reviewId));
      loadReviews();
      loadMetrics();
    } catch (err) {
      showToast(err.message || "Failed to delete review.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (!selectedIds.length) return;
    try {
      setIsBulkApproving(true);
      const res = await reviewService.bulkApprove(selectedIds);
      const count = res?.approvedCount || selectedIds.length;
      showToast(`Successfully approved ${count} pending reviews.`);
      notifyBadgeUpdate();
      setSelectedIds([]);
      loadReviews();
      loadMetrics();
    } catch (err) {
      showToast(err.message || "Bulk approval failed.", "error");
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Checkbox row toggle
  const handleSelectRow = (reviewId) => {
    setSelectedIds((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  // Select all pending rows toggle
  const handleSelectAll = (checked) => {
    if (checked) {
      const pendingIds = reviews
        .filter((r) => r.status === "pending")
        .map((r) => r.id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setRating("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ── Toast Feedback Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-60 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium shadow-xl transition-all duration-200 ${
            toast.type === "error"
              ? "bg-rose-600 text-white"
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Product Reviews
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Moderate verified customer reviews, view customer uploaded photos, and manage product ratings.
          </p>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <ReviewsSummaryCards
        metrics={metrics}
        activeStatus={status}
        onSelectStatus={(newStatus) => {
          setStatus(newStatus);
          setPage(1);
          setSelectedIds([]);
        }}
        isLoading={isMetricsLoading}
      />

      {/* ── Filters & Search Bar ── */}
      <ReviewsFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
          setSelectedIds([]);
        }}
        rating={rating}
        onRatingChange={(val) => {
          setRating(val);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(val) => {
          setDateFrom(val);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(val) => {
          setDateTo(val);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        selectedCount={selectedIds.length}
        onBulkApprove={handleBulkApprove}
        onClearSelection={() => setSelectedIds([])}
        isBulkApproving={isBulkApproving}
      />

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaExclamationCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadReviews}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Reviews Table ── */}
      <ReviewsTable
        reviews={reviews}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        onApprove={handleApprove}
        onOpenRejectModal={(rev) => setRejectingReview(rev)}
        onOpenDeleteModal={(rev) => setDeletingReview(rev)}
        onOpenDetailModal={(rev) => setDetailReview(rev)}
        isLoading={isLoading}
      />

      {/* ── Pagination ── */}
      {!isLoading && pagination.totalItems > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={(newPage) => {
            setPage(newPage);
            setSelectedIds([]);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
            setSelectedIds([]);
          }}
          limitOptions={[10, 15, 30, 50]}
          itemLabel="reviews"
        />
      )}

      {/* ── Review Detail Modal ── */}
      <ReviewDetailModal
        isOpen={!!detailReview}
        onClose={() => setDetailReview(null)}
        review={detailReview}
        onApprove={handleApprove}
        onOpenReject={(rev) => setRejectingReview(rev)}
        onOpenDelete={(rev) => setDeletingReview(rev)}
        onImageClick={(imgUrl) => setLightboxImage(imgUrl)}
      />

      {/* ── Reject Reason Modal ── */}
      <RejectReviewModal
        isOpen={!!rejectingReview}
        onClose={() => setRejectingReview(null)}
        review={rejectingReview}
        onConfirm={handleConfirmReject}
        isSubmitting={isSubmittingAction}
      />

      {/* ── Delete Confirmation Modal ── */}
      <DeleteReviewModal
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        review={deletingReview}
        onConfirm={handleConfirmDelete}
        isDeleting={isSubmittingAction}
      />

      {/* ── Fullscreen Image Lightbox ── */}
      <ReviewLightboxModal
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage}
      />
    </div>
  );
}

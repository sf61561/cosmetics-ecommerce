"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  FaStar,
  FaCheckCircle,
  FaFilter,
  FaCamera,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
} from "react-icons/fa";
import { reviewService } from "@/services/reviewService";

export default function ProductReviewsSection({ product = {} }) {
  const [reviewsData, setReviewsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [selectedRating, setSelectedRating] = useState("");
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);

  // Lightbox modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);

  const loadReviews = useCallback(async () => {
    if (!product?.id) return;
    setIsLoading(true);
    try {
      const data = await reviewService.getPublicProductReviews(product.id, {
        page,
        limit: 8,
        sort,
        rating: selectedRating,
        withPhotosOnly,
      });
      setReviewsData(data);
    } catch (err) {
      console.warn("Failed to load product reviews:", err);
    } finally {
      setIsLoading(false);
    }
  }, [product?.id, page, sort, selectedRating, withPhotosOnly]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Handle resetting page when filters change
  const handleRatingFilter = (ratingVal) => {
    setSelectedRating(ratingVal === selectedRating ? "" : ratingVal);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const handleTogglePhotosOnly = () => {
    setWithPhotosOnly((prev) => !prev);
    setPage(1);
  };

  const openLightbox = (images, startIdx = 0) => {
    setLightboxImages(images);
    setLightboxIndex(startIdx);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxImages([]);
  };

  const nextLightboxImage = () => {
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
    }
  };

  const prevLightboxImage = () => {
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    }
  };

  const avgRating = parseFloat(reviewsData?.average_rating || product?.averageRating || 0.0);
  const totalReviews = parseInt(reviewsData?.review_count || product?.reviewCount || 0, 10);
  const breakdown = reviewsData?.rating_breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const photoStrip = reviewsData?.photo_strip || [];
  const reviewsList = reviewsData?.reviews || [];
  const totalPages = reviewsData?.total_pages || 1;

  return (
    <div className="space-y-10">
      {/* ── Summary & Breakdown Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 sm:p-8 rounded-3xl bg-gray-50/60 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
        {/* Left Column: Overall Rating Score */}
        <div className="md:col-span-4 flex flex-col justify-center items-center text-center space-y-2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 pb-6 md:pb-0 md:pr-8">
          <span className="text-5xl sm:text-6xl font-bold font-serif text-gray-900 dark:text-white">
            {totalReviews > 0 ? avgRating.toFixed(1) : "0.0"}
          </span>
          <div className="flex items-center gap-1 text-amber-400 text-lg">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={star <= Math.round(avgRating) && totalReviews > 0 ? "fill-current" : "text-gray-200 dark:text-gray-700"}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Based on {totalReviews.toLocaleString()} verified {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Right Column: 5-to-1 Star Distribution Progress Bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const starCount = breakdown[star] || 0;
            const pct = totalReviews > 0 ? Math.round((starCount / totalReviews) * 100) : 0;
            const isFilterActive = selectedRating === star.toString();

            return (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingFilter(star.toString())}
                className={`group flex items-center gap-3 text-left w-full py-0.5 rounded-lg transition-colors cursor-pointer ${
                  isFilterActive ? "opacity-100" : "opacity-90 hover:opacity-100"
                }`}
              >
                <span className="w-10 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  {star} <FaStar className="w-2.5 h-2.5 text-amber-400" />
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFilterActive ? "bg-[#9B4F5E]" : "bg-amber-400 group-hover:bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {starCount} ({pct}%)
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Customer Photo Strip (if photos exist) ── */}
      {photoStrip.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FaCamera className="text-[#9B4F5E] dark:text-pink-400" />
              Customer Photos ({photoStrip.length})
            </h4>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {photoStrip.map((photo, pIdx) => (
              <div
                key={photo.id || pIdx}
                onClick={() => openLightbox(photoStrip.map((p) => p.url), pIdx)}
                className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0 cursor-pointer shadow-xs hover:shadow-md transition-all"
              >
                <img
                  src={photo.url}
                  alt="Customer Review"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                  <FaStar className="w-2 h-2" />
                  <span>{photo.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Sorting Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        {/* Star Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedRating("");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              !selectedRating
                ? "bg-[#9B4F5E] text-white shadow-2xs"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleRatingFilter(s.toString())}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                selectedRating === s.toString()
                  ? "bg-[#9B4F5E] text-white shadow-2xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <span>{s}</span>
              <FaStar className="w-2.5 h-2.5 text-amber-400" />
            </button>
          ))}

          {/* With Photos Only Toggle */}
          <label className="inline-flex items-center gap-2 ml-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withPhotosOnly}
              onChange={handleTogglePhotosOnly}
              className="h-4 w-4 rounded text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
            />
            <span>With photos only</span>
          </label>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-400 font-medium">Sort by:</span>
          <select
            value={sort}
            onChange={handleSortChange}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 font-semibold focus:border-[#9B4F5E] focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>
      </div>

      {/* ── Reviews List ── */}
      {isLoading ? (
        <div className="text-center py-16 space-y-3">
          <FaSpinner className="w-6 h-6 animate-spin mx-auto text-[#9B4F5E]" />
          <p className="text-xs text-gray-400">Loading verified reviews...</p>
        </div>
      ) : reviewsList.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 space-y-3 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center justify-center gap-1 text-gray-300 dark:text-gray-700 text-lg">
            {[1, 2, 3, 4, 5].map((s) => (
              <FaStar key={s} />
            ))}
          </div>
          <h4 className="font-serif text-lg font-normal text-gray-900 dark:text-white">
            {selectedRating || withPhotosOnly
              ? "No reviews match your selected filters."
              : "No reviews yet. Be the first to review this product."}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            {selectedRating || withPhotosOnly
              ? "Try resetting your filter to view all verified customer feedback."
              : "We only publish reviews from verified buyers who placed an order on Eloura. Complete your delivery to write a review from your order details page."}
          </p>
          {(selectedRating || withPhotosOnly) && (
            <button
              type="button"
              onClick={() => {
                setSelectedRating("");
                setWithPhotosOnly(false);
                setPage(1);
              }}
              className="mt-2 px-4 py-1.5 rounded-full bg-gray-200 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800">
          {reviewsList.map((review) => (
            <div key={review.id} className="pt-6 first:pt-0 space-y-3">
              {/* Header: Name, Stars, Verified Badge, Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                    {review.user_name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <FaCheckCircle className="w-2.5 h-2.5" />
                    <span>Verified Purchase</span>
                  </span>
                  {review.variant && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300">
                      {review.variant}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-400 text-xs">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= review.rating ? "fill-current" : "text-gray-200 dark:text-gray-700"}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {review.created_at}
                  </span>
                </div>
              </div>

              {/* Review Comment Text */}
              {review.comment && (
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {review.comment}
                </p>
              )}

              {/* Review Photo Thumbnails */}
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {review.images.map((imgUrl, iIdx) => (
                    <div
                      key={iIdx}
                      onClick={() => openLightbox(review.images, iIdx)}
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={imgUrl}
                        alt="Customer Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination / Load More Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Image Lightbox Modal ── */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors cursor-pointer"
            aria-label="Close image viewer"
          >
            <FaTimes />
          </button>

          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={prevLightboxImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-base transition-colors cursor-pointer"
              aria-label="Previous image"
            >
              <FaChevronLeft />
            </button>
          )}

          <div className="relative max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={lightboxImages[lightboxIndex]}
              alt="Review full size"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>

          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={nextLightboxImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-base transition-colors cursor-pointer"
              aria-label="Next image"
            >
              <FaChevronRight />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      )}
    </div>
  );
}

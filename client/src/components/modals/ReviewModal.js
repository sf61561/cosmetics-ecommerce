"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  FaStar,
  FaTimes,
  FaUpload,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTrashAlt,
} from "react-icons/fa";
import { reviewService } from "@/services/reviewService";

const RATING_LABELS = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

export default function ReviewModal({
  isOpen = false,
  onClose = () => {},
  product = {},
  orderItem = {},
  existingReview = null,
  onSuccess = () => {},
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);

  // Pre-fill if editing / resubmitting
  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        setRating(existingReview.rating || 5);
        setComment(existingReview.comment || "");
      } else {
        setRating(5);
        setComment("");
      }
      setSelectedFiles([]);
      setFilePreviews([]);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen, existingReview]);

  // Clean up object URLs on unmount/change
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErrorMessage("");

    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > 5) {
      setErrorMessage("You can upload a maximum of 5 images in total.");
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type.toLowerCase())) {
        setErrorMessage("Only JPG, PNG, and WebP images are allowed.");
        continue;
      }
      if (file.size > 3 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 3 MB size limit.`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index) => {
    const urlToRemove = filePreviews[index];
    if (urlToRemove) URL.revokeObjectURL(urlToRemove);

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage("Please select a star rating (1 to 5).");
      return;
    }

    // Validate comment if filled
    const trimmedComment = comment.trim();
    if (trimmedComment.length > 0 && trimmedComment.length < 10) {
      setErrorMessage("Comment must be at least 10 characters long.");
      return;
    }
    if (trimmedComment.length > 1000) {
      setErrorMessage("Comment cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("productId", product.id);
      formData.append("orderItemId", orderItem.id || "");
      formData.append("rating", rating.toString());
      if (trimmedComment) {
        formData.append("comment", trimmedComment);
      }

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      let res;
      if (existingReview && existingReview.status === "rejected") {
        res = await reviewService.resubmitReview(existingReview.id, formData);
      } else {
        res = await reviewService.submitReview(formData);
      }

      setSuccessMessage(res.message || "Review submitted successfully!");
      if (onSuccess) onSuccess(res.review);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine variant string
  const variantDisplay =
    orderItem.variantText ||
    orderItem.variant_info?.displayText ||
    (typeof orderItem.variant_info === "string" ? orderItem.variant_info : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {existingReview && existingReview.status === "rejected"
                ? "Resubmit Product Review"
                : "Write a Product Review"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Share your verified experience with this formulation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Product & Variant Mini Banner */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            {product.thumbnailUrl && (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                <Image
                  src={product.thumbnailUrl}
                  alt={product.name || "Product"}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                {product.name}
              </h4>
              {variantDisplay ? (
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300">
                  {variantDisplay}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">Standard Product</span>
              )}
            </div>
          </div>

          {/* Rejection Reason Notice if Resubmitting */}
          {existingReview?.status === "rejected" && existingReview.rejection_reason && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Previous Rejection Reason:</span>
              </div>
              <p className="text-[11px] pl-5">{existingReview.rejection_reason}</p>
            </div>
          )}

          {/* Star Rating (Clickable + Hover) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Star Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                    aria-label={`Rate ${star} stars`}
                  >
                    <FaStar
                      className={`w-7 h-7 transition-colors ${
                        isFilled ? "text-amber-400" : "text-gray-200 dark:text-gray-700"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Review Comment <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <span className={`text-[11px] ${comment.length > 1000 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                {comment.length} / 1000
              </span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike about this product? How did it feel on your skin? (Min 10 characters if filled)"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:ring-1 focus:ring-[#9B4F5E] focus:outline-none"
            />
            {comment.length > 0 && comment.length < 10 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Please enter at least 10 characters or leave blank.
              </p>
            )}
          </div>

          {/* Image Uploads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Product Photos <span className="text-gray-400 font-normal lowercase">(max 5, 3 MB each)</span>
              </label>
              <span className="text-[11px] text-gray-400">
                {selectedFiles.length} / 5
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Previews */}
              {filePreviews.map((previewUrl, idx) => (
                <div
                  key={idx}
                  className="relative group w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0 shadow-xs"
                >
                  <img
                    src={previewUrl}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove photo"
                  >
                    <FaTrashAlt className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Upload trigger button */}
              {selectedFiles.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#9B4F5E] dark:hover:border-pink-400 text-gray-400 hover:text-[#9B4F5E] dark:hover:text-pink-300 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <FaUpload className="w-4 h-4" />
                  <span className="text-[9px] font-semibold">+ Photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Submission Limit Warning Note */}
          <div className="p-3 rounded-2xl bg-[#FAF7F5] dark:bg-gray-800/40 border border-pink-100/70 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> You can submit only one review per product. Once submitted, it will be moderated before publication.
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              <FaExclamationTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              <FaCheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 p-4 shrink-0 bg-white dark:bg-gray-900 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-full bg-[#9B4F5E] text-white hover:bg-[#85414f] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


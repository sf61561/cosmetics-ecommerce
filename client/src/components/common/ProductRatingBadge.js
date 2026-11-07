"use client";

import { FaStar } from "react-icons/fa";

export default function ProductRatingBadge({
  rating = 0,
  reviewCount = 0,
  size = "sm",
  showCount = true,
  className = "",
}) {
  const count = parseInt(reviewCount || 0, 10);
  const score = parseFloat(rating || 0);

  // If review_count is 0, never show 0 stars. Show "No reviews yet" or hide.
  if (!count || count === 0 || isNaN(score) || score <= 0) {
    return (
      <span className={`text-[11px] text-gray-400 dark:text-gray-500 font-medium ${className}`}>
        No reviews yet
      </span>
    );
  }

  const starSizeClass = size === "xs" ? "w-2.5 h-2.5" : size === "md" ? "w-3.5 h-3.5" : "w-3 h-3";
  const textSizeClass = size === "xs" ? "text-[10px]" : size === "md" ? "text-xs" : "text-[11px]";

  return (
    <div className={`inline-flex items-center gap-1.5 ${textSizeClass} ${className}`}>
      <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
        <FaStar className={`${starSizeClass} fill-current`} />
        <span>{score.toFixed(1)}</span>
      </span>
      {showCount && (
        <span className="text-gray-400 dark:text-gray-500 font-normal">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import Image from "next/image";
import { FaExpand, FaTimes, FaShieldAlt } from "react-icons/fa";

export default function ProductGallery({
  images = [],
  thumbnailUrl = null,
  selectedImageUrl = null,
  productName = "Product",
  discountPercentage = null,
  isOutOfStock = false,
  isLowStock = false,
  stockQuantity = 0,
}) {
  // Normalize images list
  const gallery = images && images.length > 0
    ? images.map((img) => img.imageUrl || img)
    : [thumbnailUrl || "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ display: "none", backgroundPosition: "0% 0%" });

  const currentImage = selectedImageUrl || gallery[activeIndex] || gallery[0];

  // Desktop hover zoom lens effect
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: "block",
      backgroundPosition: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none", backgroundPosition: "0% 0%" });
  };

  return (
    <div className="space-y-4">
      {/* ── Main Product Image Container ── */}
      <div
        className="group relative aspect-square w-full rounded-3xl overflow-hidden bg-[#FAF7F5] dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Image
          src={currentImage}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover Zoom Magnifier Window (Desktop) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-200 hidden lg:block"
          style={{
            ...zoomStyle,
            backgroundImage: `url(${currentImage})`,
            backgroundSize: "220%",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ── Overlay Badges ── */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {discountPercentage && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#D64E74] text-white shadow-xs">
              SAVE {discountPercentage}%
            </span>
          )}
          {isOutOfStock ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-900/80 text-white backdrop-blur-xs">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-xs">
              Only {stockQuantity} Left
            </span>
          ) : null}
        </div>

        {/* Authenticity Watermark Badge */}
        <div className="absolute bottom-4 left-4 z-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 backdrop-blur-xs shadow-xs border border-gray-100 dark:border-gray-800">
            <FaShieldAlt className="h-3 w-3 text-[#9B4F5E] dark:text-pink-400" />
            100% Authentic
          </span>
        </div>

        {/* Lightbox Expand Trigger Button */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => setIsLightboxOpen(true)}
          aria-label="Expand image view"
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:text-[#9B4F5E] dark:hover:text-pink-400 hover:scale-110 transition-all shadow-xs border border-gray-100 dark:border-gray-800 cursor-pointer"
        >
          <FaExpand className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Gallery Thumbnails ── */}
      {gallery.length > 1 && (
        <div
          role="tablist"
          aria-label="Product thumbnails"
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800"
        >
          {gallery.map((img, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                suppressHydrationWarning
                role="tab"
                aria-selected={isSelected}
                aria-label={`Thumbnail ${idx + 1} of ${gallery.length}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative h-20 w-20 sm:h-22 sm:w-22 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#9B4F5E] ring-2 ring-[#9B4F5E]/20 shadow-xs"
                    : "border-gray-200 dark:border-gray-800 opacity-70 hover:opacity-100 hover:border-gray-300"
                }`}
              >
                <Image
                  src={img}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product image fullscreen preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full aspect-square rounded-3xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage}
              alt={productName}
              fill
              sizes="(max-width: 1200px) 100vw, 1000px"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close fullscreen image view"
              className="absolute top-4 right-4 p-3 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


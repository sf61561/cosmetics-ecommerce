"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaArrowRight, FaSpinner } from "react-icons/fa";
import { brandService } from "@/services/brandService";
import BrandLogo from "@/components/common/BrandLogo";

export default function FeaturedBrandsShowcase({ initialBrands = [] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [isLoading, setIsLoading] = useState(initialBrands.length === 0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (initialBrands && initialBrands.length > 0) {
      setBrands(initialBrands);
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;

    async function loadTopBrands() {
      try {
        setIsLoading(true);
        const res = await brandService.getTopBrands(3);
        if (isSubscribed && res?.success && Array.isArray(res.data)) {
          setBrands(res.data.slice(0, 3));
        }
      } catch (err) {
        console.warn("Unable to load top-selling brands:", err.message);
        if (isSubscribed) setLoadError(true);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadTopBrands();

    return () => {
      isSubscribed = false;
    };
  }, [initialBrands]);

  return (
    <section className="w-full bg-[#FCF8F8]/50 dark:bg-gray-950 py-16 sm:py-20 lg:py-24 border-t border-b border-pink-100/40 dark:border-gray-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="block text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#9B4F5E] dark:text-pink-400 uppercase">
            TOP BRANDS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white tracking-tight">
            Top Selling Brands
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto pt-1">
            Explore the skincare and cosmetics brands leading our sales rankings.
          </p>
        </div>

        {/* ── Top 3 Sales Brands Grid ── */}
        <div className="mt-12 sm:mt-16">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <FaSpinner className="h-8 w-8 animate-spin text-[#9B4F5E]" />
              <p className="text-xs text-gray-400">Loading top brands...</p>
            </div>
          ) : brands.length === 0 ? (
            <p className="mx-auto max-w-xl py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              {loadError
                ? "Top-selling brands are temporarily unavailable. Please try again later."
                : "No active brands are available right now."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {brands.map((brand) => {
                const targetHref = `/shop?brand=${encodeURIComponent(brand.slug)}`;
                const previewImg =
                  brand.sampleProductImage ||
                  brand.sample_product_image ||
                  brand.imageUrl ||
                  brand.image_url;

                return (
                  <Link
                    key={brand.id || brand.slug}
                    href={targetHref}
                    className="group relative flex flex-col items-center justify-between text-center rounded-3xl p-6 sm:p-8 bg-linear-to-b from-[#FFF8F8] to-[#FCF2F2] dark:from-gray-900 dark:to-gray-850 border border-pink-100/80 dark:border-gray-800 shadow-2xs hover:shadow-md hover:border-pink-200 dark:hover:border-gray-700 transition-all duration-300"
                  >
                    {/* Brand Featured Visual / Product Preview */}
                    {previewImg ? (
                      <div className="relative w-full h-40 sm:h-48 rounded-2xl bg-white dark:bg-gray-800 overflow-hidden mb-4 border border-pink-100/60 dark:border-gray-700 flex items-center justify-center p-3 shadow-2xs group-hover:shadow-sm transition-all">
                        <Image
                          src={previewImg}
                          alt={`${brand.name} preview`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : null}

                    {/* Brand Logo / Wordmark */}
                    <div className="flex items-center justify-center w-full py-1">
                      <BrandLogo brand={brand} />
                    </div>

                    {/* Tagline */}
                    <div className="mt-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 line-clamp-2">
                        {brand.tagline || brand.description || "Authentic Korean Skincare"}
                      </p>
                    </div>

                    {/* Shop Link */}
                    <div className="mt-4 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-pink-400 group-hover:translate-x-1 transition-transform">
                        Shop {brand.name} <FaArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── View All Brands Action ── */}
        <div className="mt-12 sm:mt-14 text-center">
          <Link
            href="/brands"
            className="inline-flex items-center gap-2.5 rounded-full border border-[#9B4F5E]/20 bg-[#FBF0F0] px-8 py-3.5 text-xs font-semibold tracking-wide text-[#9B4F5E] shadow-2xs transition-all duration-300 hover:bg-[#9B4F5E] hover:text-white hover:shadow-md dark:border-pink-300/20 dark:bg-gray-800 dark:text-pink-300 dark:hover:bg-[#9B4F5E] dark:hover:text-white sm:text-sm"
          >
            <span>View All Brands</span>
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

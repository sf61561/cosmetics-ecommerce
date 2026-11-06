"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaArrowRight, FaSpinner } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { brandService } from "@/services/brandService";
import BrandLogo from "@/components/common/BrandLogo";

const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "All",
];

// Fallback brands matching the design mockup if API is unreachable
const FALLBACK_BRANDS = [
  {
    id: "fb-anua",
    name: "Anua",
    slug: "anua",
    tagline: "Soothing Naturalism",
    salesCount: 2650,
  },
  {
    id: "fb-boj",
    name: "Beauty of Joseon",
    slug: "beauty-of-joseon",
    tagline: "Traditional Hanbang Heritage",
    salesCount: 3450,
  },
  {
    id: "fb-cosrx",
    name: "COSRX",
    slug: "cosrx",
    tagline: "Gentle & Effective Solutions",
    salesCount: 2980,
  },
  {
    id: "fb-isntree",
    name: "Isntree",
    slug: "isntree",
    tagline: "Natural Ingredients & Clear Skin",
    salesCount: 980,
  },
  {
    id: "fb-iunik",
    name: "iUNIK",
    slug: "iunik",
    tagline: "Minimalism for Skin & Lifestyle",
    salesCount: 850,
  },
  {
    id: "fb-laneige",
    name: "Laneige",
    slug: "laneige",
    tagline: "Water Science & Intensive Hydration",
    salesCount: 790,
  },
  {
    id: "fb-missha",
    name: "MISSHA",
    slug: "missha",
    tagline: "Inward and Outward Glow",
    salesCount: 640,
  },
  {
    id: "fb-round-lab",
    name: "ROUND LAB",
    slug: "round-lab",
    tagline: "Natural Ingredients from Korea's Land & Seas",
    salesCount: 1210,
  },
  {
    id: "fb-skin1004",
    name: "SKIN1004",
    slug: "skin1004",
    tagline: "Madagascar Centella Specialists",
    salesCount: 1890,
  },
  {
    id: "fb-some-by-mi",
    name: "SOME BY MI",
    slug: "some-by-mi",
    tagline: "Brightening & Acne Solutions",
    salesCount: 520,
  },
  {
    id: "fb-sulwhasoo",
    name: "Sulwhasoo",
    slug: "sulwhasoo",
    tagline: "Ginseng Science & Heritage",
    salesCount: 1540,
  },
  {
    id: "fb-the-lab",
    name: "the lab by blanc doux",
    slug: "the-lab-by-blanc-doux",
    tagline: "Intense Moisture & Sensitive Skin",
    salesCount: 410,
  },
];

export default function BrandsPage() {
  const [brands, setBrands] = useState(FALLBACK_BRANDS);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLetter, setActiveLetter] = useState("All");

  useEffect(() => {
    let isSubscribed = true;

    async function loadBrands() {
      setIsLoading(true);
      try {
        const res = await brandService.getPublicBrands({
          letter: activeLetter === "All" ? "" : activeLetter,
          sortBy: "name",
          sortOrder: "ASC",
          limit: 100,
        });

        if (isSubscribed && res?.success && Array.isArray(res.data)) {
          setBrands(res.data);
        }
      } catch (err) {
        console.warn("Using brands fallback:", err.message);
        // Client-side fallback filter
        if (activeLetter === "All") {
          setBrands(FALLBACK_BRANDS);
        } else {
          setBrands(
            FALLBACK_BRANDS.filter((b) =>
              b.name.toLowerCase().startsWith(activeLetter.toLowerCase())
            )
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadBrands();

    return () => {
      isSubscribed = false;
    };
  }, [activeLetter]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* ── Breadcrumb ── */}
          <nav className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors">
              Home
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">Brands</span>
          </nav>

          {/* ── Page Header ── */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white tracking-tight">
              All Brands
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto">
              Explore the most loved, authentic Korean skincare and cosmetics brands we trust and source for you.
            </p>
          </div>

          {/* ── A-Z Alphabet Quick-Filter Bar ── */}
          <div className="mt-8 sm:mt-10 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 px-4 py-2.5 rounded-full bg-[#F8EFEF] dark:bg-gray-850 shadow-2xs border border-pink-100/50 dark:border-gray-800">
              {ALPHABET.map((letter) => {
                const isActive = activeLetter === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => setActiveLetter(letter)}
                    className={`text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#9B4F5E] text-white rounded-full min-w-[28px] h-7 px-2 flex items-center justify-center shadow-xs"
                        : "text-gray-700 dark:text-gray-300 hover:text-[#9B4F5E] dark:hover:text-pink-300 min-w-[24px] h-7 px-1.5 flex items-center justify-center rounded-full hover:bg-white/60 dark:hover:bg-gray-800"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Brands Grid ── */}
          <div className="mt-12 sm:mt-16">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <FaSpinner className="h-8 w-8 animate-spin text-[#9B4F5E]" />
                <p className="text-xs text-gray-400">Loading authentic brands...</p>
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="h-12 w-12 rounded-full bg-pink-50 dark:bg-gray-800 text-[#9B4F5E] dark:text-pink-400 flex items-center justify-center mx-auto mb-3">
                  <span className="font-serif text-lg font-bold">{activeLetter}</span>
                </div>
                <h3 className="font-serif text-xl font-normal text-gray-900 dark:text-white">
                  No brands found starting with &quot;{activeLetter}&quot;
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-sm mx-auto">
                  We are constantly expanding our authentic Korean skincare selection.
                </p>
                <button
                  onClick={() => setActiveLetter("All")}
                  className="mt-5 px-5 py-2 rounded-full bg-[#9B4F5E] text-white text-xs font-medium hover:bg-[#843F4E] transition-colors shadow-2xs"
                >
                  View All Brands
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {brands.map((brand) => {
                  const targetHref = `/shop?brand=${encodeURIComponent(brand.slug)}`;

                  return (
                    <div
                      key={brand.id || brand.slug}
                      className="group relative flex flex-col items-center justify-between text-center rounded-3xl p-8 sm:p-9 bg-linear-to-b from-[#FFF8F8] to-[#FCF2F2] dark:from-gray-900 dark:to-gray-850 border border-pink-100/70 dark:border-gray-800 shadow-2xs hover:shadow-md hover:border-pink-200 dark:hover:border-gray-700 transition-all duration-300 min-h-[210px]"
                    >
                      {/* Brand Logo / Wordmark */}
                      <div className="flex-1 flex items-center justify-center w-full py-2">
                        <BrandLogo brand={brand} />
                      </div>

                      {/* Tagline */}
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
                          {brand.tagline || brand.description || "Authentic Korean Skincare"}
                        </p>
                      </div>

                      {/* Shop Brand Action */}
                      <div className="mt-5">
                        <Link
                          href={targetHref}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:text-[#843F4E] hover:bg-white/80 dark:hover:bg-gray-800 transition-all"
                        >
                          <span>Shop Brand</span>
                          <FaArrowRight className="h-2.5 w-2.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


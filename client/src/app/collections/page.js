"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaArrowRight, FaSpinner, FaChevronDown } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { collectionService } from "@/services/collectionService";
import { tagService } from "@/services/tagService";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sales_count");

  // Load active tags for the filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadTags() {
      try {
        const res = await tagService.getPublicTags({ limit: 50, sortBy: "name", sortOrder: "ASC" });
        if (isMounted && res?.tags && Array.isArray(res.tags)) {
          setTags(res.tags);
        }
      } catch (err) {
        console.warn("Failed to load tags for filter:", err);
      }
    }
    loadTags();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function loadCollections() {
      setIsLoading(true);
      try {
        const res = await collectionService.getPublicCollections({
          limit: 24,
          sortBy,
          sortOrder: sortBy === "name" ? "ASC" : "DESC",
          tag: tagFilter !== "all" ? tagFilter : undefined,
        });

        if (isSubscribed && res?.success && Array.isArray(res.data)) {
          setCollections(res.data);
        }
      } catch (err) {
        console.warn("Failed to load collections from API:", err);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadCollections();

    return () => {
      isSubscribed = false;
    };
  }, [sortBy, tagFilter]);

  // Client-side filtering fallback by tag keyword if selected
  const filteredCollections = collections.filter((col) => {
    if (tagFilter === "all" || !tagFilter) return true;
    const filterTerm = tagFilter.toLowerCase().replace(/-/g, " ");
    const text = `${col.name} ${col.description || ""}`.toLowerCase();
    return (
      text.includes(filterTerm) ||
      filterTerm.split(" ").some((w) => w.length > 2 && text.includes(w))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* ── Breadcrumb ── */}
          <nav className="text-center text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#9B4F5E] transition-colors">
              Home
            </Link>
            <span className="mx-2 text-gray-400">›</span>
            <span className="text-gray-800 font-medium">Collections</span>
          </nav>

          {/* ── Page Header ── */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 tracking-tight">
              All Collections
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xl mx-auto">
              Explore our curated ranges of authentic Korean skincare, designed to address every step of your self-care ritual.
            </p>
          </div>

          {/* ── Filters & Sorting Row ── */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-end gap-3 sm:gap-4 pb-6 border-b border-gray-100">
            {/* Filter by Tag */}
            <div className="relative inline-block">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="appearance-none rounded-full border border-gray-200 bg-white pl-4 pr-9 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer shadow-2xs"
              >
                <option value="all">Filter By Tag (All)</option>
                {tags.map((tag) => (
                  <option key={tag.id || tag.slug} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-gray-400" />
            </div>

            {/* Sort by Popularity */}
            <div className="relative inline-block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-full border border-gray-200 bg-white pl-4 pr-9 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer shadow-2xs"
              >
                <option value="sales_count">Sort By Popularity</option>
                <option value="name">Name: A to Z</option>
                <option value="created_at">Newest First</option>
              </select>
              <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-gray-400" />
            </div>
          </div>

          {/* ── Collections Grid ── */}
          <div className="mt-8 sm:mt-12">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <FaSpinner className="h-8 w-8 animate-spin text-[#9B4F5E]" />
                <p className="text-xs text-gray-400">Loading store collections...</p>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-500">No collections found matching this tag.</p>
                <button
                  type="button"
                  onClick={() => setTagFilter("all")}
                  className="mt-3 text-xs font-semibold text-[#9B4F5E] underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {filteredCollections.map((collection, index) => {
                  const targetHref = `/collections/${collection.slug}`;
                  const cardImage =
                    collection.imageUrl ||
                    collection.image_url ||
                    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

                  return (
                    <div
                      key={collection.id || index}
                      className="group relative flex flex-col items-center bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_36px_-6px_rgba(155,79,94,0.12)] hover:-translate-y-1.5 transition-all duration-300"
                    >
                      {/* Image */}
                      <Link
                        href={targetHref}
                        className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#FAF7F5] block"
                      >
                        <Image
                          src={cardImage}
                          alt={collection.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      </Link>

                      {/* Title */}
                      <Link href={targetHref} className="mt-4 sm:mt-5 text-center group/title">
                        <h3 className="font-serif text-xl sm:text-2xl text-gray-900 font-normal tracking-tight group-hover/title:text-[#9B4F5E] transition-colors">
                          {collection.name}
                        </h3>
                      </Link>

                      {/* CTA Pill Button */}
                      <div className="mt-3">
                        <Link
                          href={targetHref}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FBF0F0] hover:bg-[#9B4F5E] text-[#9B4F5E] hover:text-white px-5 py-2 text-xs font-medium tracking-wide transition-all duration-300 shadow-2xs group-hover:shadow-xs"
                        >
                          <span>Shop Now</span>
                          <FaArrowRight className="h-2.5 w-2.5 transition-transform duration-300 group-hover:translate-x-0.5" />
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


"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaSearch,
  FaTimes,
  FaHistory,
  FaArrowRight,
  FaFire,
} from "react-icons/fa";
import { searchService } from "@/services/searchService";

const RECENT_SEARCHES_KEY = "rupkotha_recent_searches";
const POPULAR_SEARCHES = [
  "Sunscreen",
  "Serum",
  "Cleanser",
  "Toner",
  "Moisturizer",
  "Centella",
  "Snail Mucin",
  "Niacinamide",
];

function getRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term) {
  if (typeof window === "undefined" || !term || !term.trim()) return;
  try {
    const clean = term.trim();
    const existing = getRecentSearches().filter(
      (item) => item.toLowerCase() !== clean.toLowerCase()
    );
    const updated = [clean, ...existing].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage issues
  }
}

function removeRecentSearch(term) {
  if (typeof window === "undefined") return [];
  try {
    const updated = getRecentSearches().filter(
      (item) => item.toLowerCase() !== term.toLowerCase()
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearAllRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore
  }
}

export default function HeaderSearchBox({
  placeholder = "Search for sunscreen, serum, cleanser...",
  isMobile = false,
  onNavigate,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState({
    products: [],
    collections: [],
    categories: [],
    brands: [],
    queries: [],
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load recent searches on initial mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete suggestion fetching (300ms)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions({ products: [], categories: [], brands: [], queries: [] });
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchService.getSuggestions(query, {
          limit: 6,
          signal: controller.signal,
        });
        setSuggestions(data);
        setSelectedIndex(-1);
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggestions({ products: [], categories: [], brands: [], queries: [] });
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Execute full search
  const handleSubmit = useCallback(
    (e) => {
      if (e) e.preventDefault();
      const term = query.trim();
      if (!term) return;

      saveRecentSearch(term);
      setRecentSearches(getRecentSearches());
      setIsOpen(false);
      if (onNavigate) onNavigate();
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [query, router, onNavigate]
  );

  // Select a suggestion or recent term directly
  const handleSelectTerm = (term) => {
    setQuery(term);
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    setIsOpen(false);
    if (onNavigate) onNavigate();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions({ products: [], categories: [], brands: [], queries: [] });
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  // Build flattened list of active suggestion items for keyboard navigation (products only)
  const allSelectableItems = [];
  if (query.trim().length >= 2) {
    (suggestions.products || []).forEach((p) =>
      allSelectableItems.push({
        type: "product",
        href: `/products/${p.slug}`,
        label: p.name,
      })
    );
    // "See all results"
    allSelectableItems.push({
      type: "all",
      href: `/search?q=${encodeURIComponent(query.trim())}`,
      label: `See all results for “${query.trim()}”`,
    });
  }

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < allSelectableItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : allSelectableItems.length - 1
      );
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && allSelectableItems[selectedIndex]) {
        e.preventDefault();
        const selected = allSelectableItems[selectedIndex];
        saveRecentSearch(query.trim());
        setIsOpen(false);
        if (onNavigate) onNavigate();
        router.push(selected.href);
      } else {
        handleSubmit(e);
      }
    }
  };

  const hasSuggestions =
    Array.isArray(suggestions.products) && suggestions.products.length > 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${isMobile ? "w-full" : "w-52 lg:w-72 xl:w-80"}`}
    >
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          ref={inputRef}
          suppressHydrationWarning
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setRecentSearches(getRecentSearches());
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className={`w-full rounded-full bg-[#FBF0F0] text-sm text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-[#F5D5D5] focus:shadow-xs ${
            isMobile
              ? "h-11 pl-4 pr-16 text-base"
              : "h-9.5 pl-4 pr-16 text-sm"
          }`}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Clear search input"
          >
            <FaTimes className="h-3 w-3" />
          </button>
        )}

        {/* Search Icon / Submit Button */}
        <button
          type="submit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9B4F5E] hover:text-[#843F4E] transition-colors cursor-pointer"
          aria-label="Submit search"
        >
          {isLoading ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
          ) : (
            <FaSearch className="h-3.5 w-3.5" />
          )}
        </button>
      </form>

      {/* Autocomplete & Recents Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[80vh] overflow-y-auto rounded-3xl border border-pink-100 bg-white p-3 shadow-xl backdrop-blur-md">
          {/* State 1: Active query with matches (Products only) */}
          {query.trim().length >= 2 ? (
            hasSuggestions ? (
              <div className="space-y-3">
                {/* Product matches */}
                <div>
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Products
                  </span>
                  <div className="mt-1 divide-y divide-gray-50">
                    {suggestions.products.map((p, idx) => {
                      const price = p.salePrice || p.price;
                      const isSelected = selectedIndex === idx;
                      return (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          onClick={() => {
                            saveRecentSearch(p.name);
                            setIsOpen(false);
                            if (onNavigate) onNavigate();
                          }}
                          className={`flex items-center gap-3 rounded-2xl p-2 transition ${
                            isSelected ? "bg-[#FBF0F0]" : "hover:bg-[#FBF0F0]"
                          }`}
                        >
                          {p.thumbnailUrl ? (
                            <img
                              src={p.thumbnailUrl}
                              alt={p.name}
                              className="h-11 w-11 shrink-0 rounded-xl object-cover bg-gray-50"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[10px] font-semibold text-[#9B4F5E]">
                              Beauty
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                              {p.brandName}
                            </p>
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {p.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-[#9B4F5E]">
                              ৳{Number(price).toLocaleString()}
                            </span>
                            {p.salePrice && p.salePrice < p.price && (
                              <span className="block text-[10px] text-gray-400 line-through">
                                ৳{Number(p.price).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom link: See all results */}
                <div className="border-t border-gray-100 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#9B4F5E] transition cursor-pointer ${
                      selectedIndex === suggestions.products.length
                        ? "bg-[#FBF0F0]"
                        : "hover:bg-pink-50"
                    }`}
                  >
                    <span>See all results for “{query.trim()}”</span>
                    <FaArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="py-6 text-center text-xs text-gray-400">
                Searching authentic beauty catalog...
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs font-medium text-gray-700">
                  No direct suggestions for “{query.trim()}”
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#843F4E] transition"
                >
                  Search catalog
                  <FaArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          ) : (
            /* State 2: Input is empty or 1 character -> Show recent & popular searches */
            <div className="space-y-4 p-1">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <FaHistory className="h-2.5 w-2.5" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearAllRecentSearches();
                        setRecentSearches([]);
                      }}
                      className="text-[10px] font-semibold text-gray-400 hover:text-red-500 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        className="group flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition hover:border-pink-300 hover:bg-pink-50 hover:text-[#9B4F5E]"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectTerm(term)}
                          className="cursor-pointer"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = removeRecentSearch(term);
                            setRecentSearches(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          aria-label={`Remove ${term} from recent searches`}
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular trending terms */}
              <div>
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pb-1.5">
                  <FaFire className="h-2.5 w-2.5 text-amber-500" />
                  Trending Searches
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectTerm(term)}
                      className="rounded-full border border-pink-100 bg-[#FBF0F0] px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-pink-300 hover:bg-pink-100 hover:text-[#9B4F5E] cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


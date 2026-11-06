"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaSpinner } from "react-icons/fa";
import { collectionService } from "@/services/collectionService";

export default function CollectionsShowcase({ initialCollections = [] }) {
  const [collections, setCollections] = useState(initialCollections);
  const [isLoading, setIsLoading] = useState(initialCollections.length === 0);

  useEffect(() => {
    // If SSR already provided the collections, no need to re-fetch
    if (initialCollections && initialCollections.length > 0) {
      setCollections(initialCollections);
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;

    async function loadTopCollections() {
      try {
        setIsLoading(true);
        const res = await collectionService.getTopCollections(3);
        if (isSubscribed && res?.success && Array.isArray(res.data)) {
          setCollections(res.data.slice(0, 3));
        }
      } catch (err) {
        console.warn("Unable to load top collections:", err.message);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadTopCollections();

    return () => {
      isSubscribed = false;
    };
  }, [initialCollections]);

  return (
    <section className="w-full bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="block text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#9B4F5E] uppercase">
            Explore By Need
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 tracking-tight">
            Discover Our Collections
          </h2>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-xl mx-auto pt-1">
            Targeted skincare solutions crafted for your unique skin journey.
          </p>
        </div>

        {/* ── Top 3 Most Sales Collections Grid ── */}
        <div className="mt-12 sm:mt-16">
          {isLoading && collections.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex flex-col items-center bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs animate-pulse"
                >
                  <div className="w-full aspect-[4/5] rounded-2xl bg-gray-100" />
                  <div className="mt-5 h-6 w-36 bg-gray-100 rounded-full" />
                  <div className="mt-4 h-8 w-24 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {collections.map((collection, index) => {
                const targetHref = `/collections/${collection.slug}`;
                const cardImage =
                  collection.imageUrl ||
                  collection.image_url ||
                  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={collection.id || collection.slug || index}
                    className="group relative flex flex-col items-center bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_36px_-6px_rgba(155,79,94,0.12)] hover:-translate-y-1.5 transition-all duration-300"
                  >
                    {/* Collection Image */}
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
                        priority={index === 0}
                      />
                    </Link>

                    {/* Collection Title */}
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

        {/* ── View All Collections Button ── */}
        <div className="mt-12 sm:mt-16 text-center">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2.5 rounded-full border border-[#9B4F5E]/20 bg-[#FBF0F0] px-8 py-3.5 text-xs font-semibold tracking-wide text-[#9B4F5E] shadow-2xs transition-all duration-300 hover:bg-[#9B4F5E] hover:text-white hover:shadow-md dark:border-pink-300/20 dark:bg-gray-800 dark:text-pink-300 dark:hover:bg-[#9B4F5E] dark:hover:text-white sm:text-sm"
          >
            <span>View All Collections</span>
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

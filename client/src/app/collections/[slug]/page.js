"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaSpinner, FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { collectionService } from "@/services/collectionService";

export default function SingleCollectionPage() {
  const params = useParams();
  const slug = params?.slug;

  const [collection, setCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let isSubscribed = true;

    async function loadCollection() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await collectionService.getPublicCollectionBySlug(slug);
        if (isSubscribed) {
          if (res?.success && res.data) {
            setCollection(res.data);
          } else {
            setError(res?.message || "Collection not found");
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.message || "Failed to load collection details.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadCollection();

    return () => {
      isSubscribed = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <FaSpinner className="h-8 w-8 animate-spin text-[#9B4F5E]" />
          <p className="text-xs text-gray-500">Loading collection...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="font-serif text-2xl text-gray-900">Collection Not Found</h2>
          <p className="text-xs text-gray-500">
            {error || "The collection you are looking for is currently unavailable."}
          </p>
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#843f4e] transition-colors"
          >
            <FaArrowLeft className="h-3 w-3" />
            Back to Collections
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ── Collection Hero Banner ── */}
        <section className="relative w-full bg-[#FAF7F5] border-b border-[#F2E8E6] py-14 sm:py-18">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <nav className="text-xs text-gray-500 mb-3" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-[#9B4F5E] transition-colors">
                  Home
                </Link>
                <span className="mx-2 text-gray-400">›</span>
                <Link href="/collections" className="hover:text-[#9B4F5E] transition-colors">
                  Collections
                </Link>
                <span className="mx-2 text-gray-400">›</span>
                <span className="text-gray-800 font-medium">{collection.name}</span>
              </nav>

              <span className="inline-block text-[11px] font-semibold tracking-[0.2em] text-[#9B4F5E] uppercase bg-white px-3 py-1 rounded-full border border-gray-100 shadow-2xs">
                Curated Routine
              </span>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 tracking-tight">
                {collection.name}
              </h1>

              {collection.description && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto pt-1">
                  {collection.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Products in this Collection ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-8">
            <h2 className="text-base font-bold text-gray-900">
              Products in this Collection{" "}
              <span className="text-xs font-normal text-gray-500">
                ({collection.products?.length || 0})
              </span>
            </h2>
            <Link
              href="/collections"
              className="text-xs font-medium text-[#9B4F5E] hover:underline"
            >
              ← Back to all collections
            </Link>
          </div>

          {collection.products?.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-sm text-gray-600">No products are currently linked to this collection.</p>
              <p className="text-xs text-gray-400">Check back soon as new stock is added daily.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collection.products.map((product) => (
                <div
                  key={product.id}
                  className="group flex flex-col bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                    <Image
                      src={
                        product.thumbnailUrl ||
                        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80"
                      }
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex flex-col">
                      {product.salePrice ? (
                        <>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            ৳{product.salePrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 line-through">
                            ৳{product.price.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-gray-900">
                          ৳{product.price.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#843f4e] transition-colors shadow-2xs"
                    >
                      <FaShoppingCart className="h-2.5 w-2.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

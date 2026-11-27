"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaSpinner, FaArrowLeft } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BrandLogo from "@/components/common/BrandLogo";
import { brandService } from "@/services/brandService";
import { productService } from "@/services/productService";

export default function SingleBrandPage() {
  const params = useParams();
  const slug = params?.slug;

  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let active = true;

    brandService
      .getPublicBrandBySlug(slug)
      .then(async (res) => {
        if (!active) return;
        if (!res?.success || !res?.data) {
          setError(res?.message || "Brand not found.");
          return;
        }
        setBrand(res.data);
        try {
          const prodRes = await productService.getProducts({ brandId: res.data.id, limit: 24 });
          if (active && prodRes?.success) {
            setProducts(prodRes.data || []);
          }
        } catch {
          if (active) setProducts([]);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Brand not found.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <FaSpinner className="h-8 w-8 animate-spin text-[#9B4F5E]" />
          <p className="text-xs text-gray-500">Loading brand...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <h1 className="font-serif text-2xl text-gray-900">Brand Not Found</h1>
          <p className="text-xs text-gray-500">
            {error || "The brand you are looking for is currently unavailable."}
          </p>
          <Link
            href="/brands"
            className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#843f4e] transition-colors"
          >
            <FaArrowLeft className="h-3 w-3" />
            Back to Brands
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
        <section className="w-full bg-[#FAF7F5] border-b border-[#F2E8E6] py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 text-center space-y-4">
            <nav className="text-xs text-gray-500" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-[#9B4F5E]">Home</Link>
              <span className="mx-2 text-gray-400">›</span>
              <Link href="/brands" className="hover:text-[#9B4F5E]">Brands</Link>
              <span className="mx-2 text-gray-400">›</span>
              <span className="text-gray-800 font-medium">{brand.name}</span>
            </nav>

            <div className="flex justify-center">
              <BrandLogo brand={brand} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-gray-900">
                {brand.name}
              </h1>
              {brand.isDraft && (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-0.5 text-[11px] font-semibold text-amber-900">
                  Draft
                </span>
              )}
            </div>

            {brand.tagline && (
              <p className="text-sm font-medium text-[#9B4F5E]">{brand.tagline}</p>
            )}
            {brand.description && (
              <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
                {brand.description}
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-8">
            <h2 className="text-base font-bold text-gray-900">
              Products by {brand.name}{" "}
              <span className="text-xs font-normal text-gray-500">({products.length})</span>
            </h2>
            <Link href="/brands" className="text-xs font-medium text-[#9B4F5E] hover:underline">
              ← Back to all brands
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">
              No products available under this brand yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group flex flex-col bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs hover:shadow-lg transition-all"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                    {product.thumbnailUrl && (
                      <Image
                        src={product.thumbnailUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {product.isDraft && (
                      <span className="absolute top-2 left-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <div className="mt-3 pt-2 border-t border-gray-50 flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      ৳{Number(product.salePrice || product.price || 0).toLocaleString()}
                    </span>
                    {product.salePrice && (
                      <span className="text-[10px] text-gray-400 line-through">
                        ৳{Number(product.price || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

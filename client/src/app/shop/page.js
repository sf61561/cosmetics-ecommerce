"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaExclamationCircle, FaShoppingBag, FaCheck } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { productService } from "@/services/productService";
import WishlistButton from "@/components/product/WishlistButton";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80";

export default function ShopPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts({ limit: 50 });
      if (response?.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    async function loadInitialProducts() {
      try {
        const response = await productService.getProducts({ limit: 50 });
        if (isSubscribed) {
          if (response?.success && Array.isArray(response.data)) {
            setProducts(response.data);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.message || "Failed to load products. Please try again.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadInitialProducts();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleAddToCart = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    const result = await addToCart(product.id);
    if (result.success) {
      setAddedIds((previous) => new Set(previous).add(product.id));
      window.setTimeout(() => {
        setAddedIds((previous) => {
          const next = new Set(previous);
          next.delete(product.id);
          return next;
        });
      }, 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF9] dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#9B4F5E]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">Shop All</span>
          </nav>

          <header className="mx-auto mt-6 max-w-2xl space-y-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9B4F5E] dark:text-pink-400">
              THE RUPKOTHA EDIT
            </span>
            <h1 className="font-serif text-3xl tracking-tight text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
              Shop All Products
            </h1>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Discover our complete collection of authentic skincare and beauty essentials.
            </p>
            {!isLoading && !error && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {products.length} product{products.length === 1 ? "" : "s"} available
              </p>
            )}
          </header>

          {isLoading && (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  key={item}
                  className="animate-pulse space-y-4 rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="mx-auto mt-12 max-w-md space-y-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
              <FaExclamationCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={loadProducts}
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && products.length === 0 && (
            <div className="mx-auto mt-16 max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <FaShoppingBag className="mx-auto h-8 w-8 text-[#9B4F5E]" />
              <h2 className="mt-4 font-serif text-xl text-gray-900 dark:text-gray-100">
                No products available
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please check back soon for new beauty essentials.
              </p>
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => {
                const isAdded = addedIds.has(product.id);
                const price = product.salePrice ?? product.price;
                const brandName = product.brand?.name || "RUPKOTHA";

                return (
                  <article
                    key={product.id}
                    className="group flex flex-col rounded-3xl border border-pink-100/70 bg-white p-5 shadow-2xs transition-all duration-300 hover:border-pink-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                  >
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#FAF7F5] dark:bg-gray-800">
                        <Image
                          src={product.thumbnailUrl || FALLBACK_IMAGE}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute top-3 right-3 z-10">
                          <WishlistButton productId={product.id} size="sm" />
                        </div>
                      </div>
                      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B4F5E] dark:text-pink-400">
                        {brandName}
                      </p>
                      <h2 className="mt-1 min-h-[2.75rem] text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {product.name}
                      </h2>
                    </Link>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          ৳{Number(price).toLocaleString()}
                        </span>
                        {product.salePrice && (
                          <span className="ml-2 text-[10px] text-gray-400 line-through">
                            ৳{Number(product.price).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => handleAddToCart(event, product)}
                        disabled={isAdded || product.stockQuantity <= 0}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isAdded ? <FaCheck className="h-2.5 w-2.5" /> : <FaShoppingBag className="h-2.5 w-2.5" />}
                        {isAdded ? "Added" : product.stockQuantity <= 0 ? "Sold out" : "Add"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { productService } from "@/services/productService";
import ProductForm from "@/components/admin/products/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Load dropdown metadata on mount
  useEffect(() => {
    let isSubscribed = true;

    async function loadMetadata() {
      setIsLoadingMeta(true);
      setMetaError(null);
      try {
        const [catsRes, brandsRes, collectionsRes, tagsRes] = await Promise.all([
          productService.getCategories(),
          productService.getBrands(),
          productService.getCollections(),
          productService.getTags(),
        ]);

        if (isSubscribed) {
          if (catsRes?.success) setCategories(catsRes.data || []);
          if (brandsRes?.success) setBrands(brandsRes.data || []);
          if (collectionsRes?.success) setCollections(collectionsRes.data || []);
          if (tagsRes?.tags) setTags(tagsRes.tags);
          else if (tagsRes?.data) setTags(tagsRes.data);
        }
      } catch (err) {
        if (isSubscribed) {
          setMetaError(err.message || "Failed to load required catalog metadata");
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingMeta(false);
        }
      }
    }

    loadMetadata();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Form submission handler
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await productService.createProduct(formData);
      if (response?.success) {
        // Successfully created product; redirect back to products catalog
        router.push("/admin/products");
      } else {
        setServerError(response?.message || "Failed to create product");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setServerError(
        err.field
          ? { field: err.field, message: err.message }
          : err.data?.message || err.message || "An unexpected error occurred while saving product."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Loading Metadata Skeleton */}
      {isLoadingMeta ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <FaSpinner className="h-9 w-9 animate-spin text-[#9B4F5E]" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Loading catalog taxonomy & metadata...
          </p>
        </div>
      ) : metaError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/40 text-center space-y-4">
          <FaExclamationTriangle className="mx-auto h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Catalog Loading Error</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{metaError}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#9B4F5E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#843f4e] transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <ProductForm
          initialProduct={null}
          brands={brands}
          categories={categories}
          collections={collections}
          tags={tags}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          serverError={serverError}
        />
      )}
    </div>
  );
}

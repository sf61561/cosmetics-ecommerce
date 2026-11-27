"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaSpinner, FaExclamationTriangle, FaEye } from "react-icons/fa";
import { productService } from "@/services/productService";
import { useAuth } from "@/context/AuthContext";
import ProductForm from "@/components/admin/products/ProductForm";
import StorefrontPreviewDrawer from "@/components/admin/preview/StorefrontPreviewDrawer";

export default function EditProductPage() {
  const router = useRouter();
  const routeParams = useParams();
  const id = routeParams?.id;
  const { isSuperAdmin, hasPermission } = useAuth();
  const canPreviewStorefront = isSuperAdmin || hasPermission("storefront.view");
  const canPreviewDrafts = isSuperAdmin || hasPermission("storefront.preview_drafts");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [product, setProduct] = useState(null);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let isSubscribed = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [prodRes, catsRes, brandsRes, collectionsRes, tagsRes] = await Promise.all([
          productService.getAdminProductById(id),
          productService.getCategories(),
          productService.getBrands(),
          productService.getCollections(),
          productService.getTags(),
        ]);

        if (isSubscribed) {
          if (prodRes?.success) {
            setProduct(prodRes.data);
          } else {
            setError(prodRes?.message || "Product not found");
          }

          if (catsRes?.success) setCategories(catsRes.data || []);
          if (brandsRes?.success) setBrands(brandsRes.data || []);
          if (collectionsRes?.success) setCollections(collectionsRes.data || []);
          if (tagsRes?.tags) setTags(tagsRes.tags);
          else if (tagsRes?.data) setTags(tagsRes.data);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.message || "Failed to load product details and taxonomy");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [id]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await productService.updateProduct(id, formData);
      if (response?.success) {
        // Successfully updated product; redirect back to catalog
        router.push("/admin/products");
      } else {
        setServerError(response?.message || "Failed to update product");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setServerError(
        err.field
          ? { field: err.field, message: err.message }
          : err.data?.message || err.message || "An unexpected error occurred while updating product."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <FaSpinner className="h-9 w-9 animate-spin text-[#9B4F5E]" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading product configuration & inventory...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900/60 dark:bg-red-950/40 text-center space-y-4">
        <FaExclamationTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Unable to Load Product
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300">
          {error || "The requested product does not exist or has been removed."}
        </p>
        <div className="pt-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-lg bg-[#9B4F5E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#843f4e] transition-colors"
          >
            <FaArrowLeft className="h-3 w-3" />
            Back to Products Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {canPreviewStorefront && product?.slug && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FaEye className="h-3.5 w-3.5 text-[#9B4F5E]" aria-hidden="true" />
            <span>Preview</span>
          </button>
        </div>
      )}

      <ProductForm
        initialProduct={product}
        brands={brands}
        categories={categories}
        collections={collections}
        tags={tags}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        serverError={serverError}
      />

      {canPreviewStorefront && product?.slug && (
        <StorefrontPreviewDrawer
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={`Preview: ${product.name}`}
          path={`/products/${product.slug}`}
          canPreviewDrafts={canPreviewDrafts}
        />
      )}
    </div>
  );
}


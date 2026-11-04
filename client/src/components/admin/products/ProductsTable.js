"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaBoxOpen,
  FaEdit,
  FaTrash,
  FaEye,
  FaExclamationTriangle,
  FaTag,
  FaLayerGroup,
} from "react-icons/fa";

export default function ProductsTable({
  products = [],
  isLoading = false,
  error = null,
  onView = () => {},
  onDelete = () => {},
  onStatusChange = () => {},
  onRetry = () => {},
}) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="h-2.5 w-1/4 rounded-md bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-8 text-center shadow-xs">
        <FaExclamationTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Failed to load products
        </h3>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-2xs transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 mb-4">
          <FaBoxOpen className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          No products found
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No cosmetics match your filter criteria. Try adjusting your search term or add a new product to your inventory.
        </p>
        <div className="mt-5">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#9B4F5E] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#843f4e] transition-colors"
          >
            + Add First Product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
      {/* ── Desktop Table View ── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/70 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Product
              </th>
              <th scope="col" className="px-4 py-3.5">
                Brand & Collections
              </th>
              <th scope="col" className="px-4 py-3.5">
                Price (BDT)
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Updated
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {products.map((p) => {
              const formattedDate = p.updatedAt
                ? new Date(p.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Product thumbnail + Title + SKU */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0">
                        {p.thumbnailUrl ? (
                          <Image
                            src={p.thumbnailUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#9B4F5E]/40 dark:text-pink-400/40">
                            <FaBoxOpen className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <p
                          className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors"
                          title={p.name}
                        >
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.sku && (
                            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.2 rounded-sm select-all">
                              {p.sku}
                            </span>
                          )}
                          {p.volume && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              • {p.volume}
                            </span>
                          )}
                          {p.isFeatured && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full border border-amber-200 dark:border-amber-800">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Brand & Collections */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      {p.brand ? (
                        <span className="inline-flex items-center rounded-md bg-pink-50/70 dark:bg-pink-950/40 px-2 py-0.5 text-[11px] font-medium text-[#9B4F5E] dark:text-pink-300 border border-pink-200/50 dark:border-pink-900/40">
                          {p.brand.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                      {p.collections && p.collections.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-0.5 max-w-[160px]">
                          {p.collections.map((col) => (
                            <span
                              key={col.id}
                              className="inline-flex items-center text-[10px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-sm"
                            >
                              <FaLayerGroup className="h-2 w-2 mr-1 text-[#9B4F5E]/70 dark:text-pink-400/70" />
                              {col.name}
                            </span>
                          ))}
                        </div>
                      ) : p.category ? (
                        <span className="inline-flex items-center text-[10px] text-gray-500 dark:text-gray-400">
                          <FaTag className="h-2 w-2 mr-1 text-gray-400" />
                          {p.category.name}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Price (Variant-wise Breakdown if Multi-variant) */}
                  <td className="px-4 py-4">
                    <div>
                      {p.hasVariants && p.variants && p.variants.length > 0 ? (
                        <div className="flex flex-col gap-1.5 min-w-[140px] max-w-[210px]">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                              From ৳{(p.minVariantPrice || p.price).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-semibold text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-full border border-pink-200/50 dark:border-pink-900/50">
                              {p.variants.length} variants
                            </span>
                          </div>

                          {/* Variant-wise price pills */}
                          <div className="flex flex-col gap-1">
                            {p.variants.map((v) => {
                              const vPrice = Number(v.price || 0);
                              const vSale =
                                v.salePrice !== null && v.salePrice !== undefined
                                  ? Number(v.salePrice)
                                  : null;
                              const hasVarDiscount =
                                vSale !== null && vSale > 0 && vSale < vPrice;

                              return (
                                <div
                                  key={v.id || v.optionsKey}
                                  className="flex items-center justify-between gap-1.5 text-[11px] bg-gray-50/80 dark:bg-gray-800/50 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-800/80"
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    {v.swatchHex && (
                                      <span
                                        className="h-2.5 w-2.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs"
                                        style={{ backgroundColor: v.swatchHex }}
                                      />
                                    )}
                                    <span
                                      className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[95px]"
                                      title={v.label || v.optionsKey}
                                    >
                                      {v.label || v.optionsKey}
                                    </span>
                                  </div>
                                  <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0 font-mono text-[10.5px]">
                                    ৳{(hasVarDiscount ? vSale : vPrice).toLocaleString()}
                                    {hasVarDiscount && (
                                      <span className="ml-1 text-[9px] text-gray-400 line-through">
                                        ৳{vPrice.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : p.hasVariants ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            From ৳{(p.minVariantPrice || p.price).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-semibold text-[#9B4F5E] dark:text-pink-300">
                            Multiple variants
                          </span>
                        </div>
                      ) : p.salePrice && Number(p.salePrice) < Number(p.price) ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            ৳{p.salePrice.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 line-through">
                            ৳{p.price.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          ৳{p.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <select
                      value={p.status}
                      onChange={(e) => onStatusChange(p.id, e.target.value)}
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-colors cursor-pointer focus:outline-hidden ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : p.status === "DRAFT"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                          : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                      }`}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>

                  {/* Updated Date */}
                  <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-[11px]">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(p)}
                        title="View details"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        <FaEye className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/admin/products/${p.id}`}
                        title="Edit product"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-[#9B4F5E]/10 hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        title="Delete product"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card View (Cards under lg) ── */}
      <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800 p-4 space-y-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="pt-4 first:pt-0 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0">
                {p.thumbnailUrl ? (
                  <Image
                    src={p.thumbnailUrl}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#9B4F5E]/40">
                    <FaBoxOpen className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">
                    {p.name}
                  </span>
                  <span className="font-bold text-xs text-gray-900 dark:text-gray-100 shrink-0">
                    {p.hasVariants
                      ? `From ৳${(p.minVariantPrice || p.price).toLocaleString()}`
                      : `৳${(p.salePrice || p.price).toLocaleString()}`}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                  SKU: {p.sku || "N/A"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {p.brand && (
                    <span className="text-[10px] font-medium bg-pink-50 dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 px-2 py-0.5 rounded-md border border-pink-200/50">
                      {p.brand.name}
                    </span>
                  )}
                  {p.collections && p.collections.length > 0 && (
                    <span className="inline-flex items-center text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
                      <FaLayerGroup className="h-2 w-2 mr-1 text-[#9B4F5E]/70 dark:text-pink-400/70" />
                      {p.collections.map((c) => c.name).join(", ")}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Mobile Variant-wise price list */}
                {p.hasVariants && p.variants && p.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.variants.map((v) => (
                      <span
                        key={v.id || v.optionsKey}
                        className="inline-flex items-center gap-1 text-[10px] bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-800 font-mono"
                      >
                        {v.swatchHex && (
                          <span
                            className="h-2 w-2 rounded-full border border-gray-300 shrink-0"
                            style={{ backgroundColor: v.swatchHex }}
                          />
                        )}
                        <span className="text-gray-600 dark:text-gray-400 font-sans">{v.label || v.optionsKey}:</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">৳{Number(v.price).toLocaleString()}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions for mobile card */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-2.5">
              <button
                type="button"
                onClick={() => onView(p)}
                className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300"
              >
                <FaEye className="h-3 w-3" /> View
              </button>
              <Link
                href={`/admin/products/${p.id}`}
                className="flex items-center gap-1 rounded-full bg-[#9B4F5E] px-3 py-1 text-[11px] font-semibold text-white shadow-2xs"
              >
                <FaEdit className="h-3 w-3" /> Edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete(p)}
                className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-900/60 px-3 py-1 text-[11px] font-medium text-red-600 dark:text-red-400"
              >
                <FaTrash className="h-2.5 w-2.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

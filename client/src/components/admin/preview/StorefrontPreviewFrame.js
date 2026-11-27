"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IoDesktopOutline,
  IoTabletPortraitOutline,
  IoPhonePortraitOutline,
  IoRefreshOutline,
  IoOpenOutline,
  IoEyeOutline,
  IoLockClosedOutline,
  IoAlertCircleOutline,
  IoSearchOutline,
} from "react-icons/io5";

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: IoDesktopOutline, widthClass: "w-full" },
  { id: "tablet", label: "Tablet", icon: IoTabletPortraitOutline, widthClass: "w-[768px] max-w-full" },
  { id: "mobile", label: "Mobile", icon: IoPhonePortraitOutline, widthClass: "w-[390px] max-w-full" },
];

const STATIC_PAGES = [
  { id: "home", label: "Home", path: "/" },
  { id: "collection", label: "Collection" },
  { id: "brand", label: "Brand" },
  { id: "product", label: "Product" },
  { id: "cart", label: "Cart", path: "/cart" },
  { id: "contact", label: "Contact Us", path: "/contact" },
];

function appendPreviewParams(path, cacheBust) {
  const cleanPath = path && path.startsWith("/") ? path : "/";
  const url = new URL(cleanPath, "http://localhost");
  url.searchParams.set("preview", "1");
  if (cacheBust) {
    url.searchParams.set("_pv", String(cacheBust));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function StorefrontPreviewFrame({
  initialPath = "/",
  collections = [],
  brands = [],
  products = [],
  canPreviewDrafts = false,
  showPageSelector = true,
  heightClass = "h-[calc(100vh-14rem)] min-h-[540px]",
}) {
  const [pageType, setPageType] = useState("home");
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState(
    collections[0]?.slug || ""
  );
  const [selectedBrandSlug, setSelectedBrandSlug] = useState(brands[0]?.slug || "");
  const [selectedProductSlug, setSelectedProductSlug] = useState(products[0]?.slug || "");
  const [productQuery, setProductQuery] = useState("");
  const [customPath, setCustomPath] = useState(initialPath !== "/" ? initialPath : "");

  const [device, setDevice] = useState("desktop");
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const [frameLoading, setFrameLoading] = useState(true);
  const [frameError, setFrameError] = useState("");
  const timeoutRef = useRef(null);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const effectiveColSlug = selectedCollectionSlug || collections[0]?.slug || "";
  const effectiveBrandSlug = selectedBrandSlug || brands[0]?.slug || "";
  const effectiveProdSlug = selectedProductSlug || filteredProducts[0]?.slug || products[0]?.slug || "";

  const resolvedPath = useMemo(() => {
    if (!showPageSelector && initialPath) return initialPath;
    if (customPath) return customPath;
    if (pageType === "home") return "/";
    if (pageType === "cart") return "/cart";
    if (pageType === "contact") return "/contact";
    if (pageType === "collection") {
      return effectiveColSlug ? `/collections/${effectiveColSlug}` : "/collections";
    }
    if (pageType === "brand") {
      return effectiveBrandSlug ? `/brands/${effectiveBrandSlug}` : "/brands";
    }
    if (pageType === "product") {
      return effectiveProdSlug ? `/products/${effectiveProdSlug}` : "/shop";
    }
    return "/";
  }, [
    showPageSelector,
    initialPath,
    customPath,
    pageType,
    effectiveColSlug,
    effectiveBrandSlug,
    effectiveProdSlug,
  ]);

  const iframeSrc = useMemo(
    () => appendPreviewParams(resolvedPath, cacheBust),
    [resolvedPath, cacheBust]
  );

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFrameError((prev) =>
        prev ? prev : "Storefront frame took too long to respond."
      );
      setFrameLoading(false);
    }, 15000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [iframeSrc]);

  const activeDeviceConfig = DEVICES.find((d) => d.id === device) || DEVICES[0];

  const handleRefresh = () => {
    setFrameError("");
    setFrameLoading(true);
    setCacheBust(Date.now());
  };

  const handleSelectPageType = (nextType) => {
    setCustomPath("");
    setFrameError("");
    setFrameLoading(true);
    setPageType(nextType);
    setCacheBust(Date.now());
  };

  return (
    <div className="space-y-3">
      {/* Toolbar (wraps cleanly onto two lines on tablet; full controls on desktop) */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showPageSelector ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <span>Page:</span>
                <select
                  aria-label="Preview page selector"
                  value={pageType}
                  onChange={(e) => handleSelectPageType(e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                >
                  {STATIC_PAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {pageType === "collection" && (
                <select
                  aria-label="Select collection to preview"
                  value={effectiveColSlug}
                  onChange={(e) => {
                    setCustomPath("");
                    setFrameError("");
                    setFrameLoading(true);
                    setSelectedCollectionSlug(e.target.value);
                  }}
                  className="max-w-[240px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
                >
                  {collections.length === 0 ? (
                    <option value="">No collections available</option>
                  ) : (
                    collections.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                        {c.isDraft ? " (Draft)" : ""}
                      </option>
                    ))
                  )}
                </select>
              )}

              {pageType === "brand" && (
                <select
                  aria-label="Select brand to preview"
                  value={effectiveBrandSlug}
                  onChange={(e) => {
                    setCustomPath("");
                    setFrameError("");
                    setFrameLoading(true);
                    setSelectedBrandSlug(e.target.value);
                  }}
                  className="max-w-[240px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
                >
                  {brands.length === 0 ? (
                    <option value="">No brands available</option>
                  ) : (
                    brands.map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                        {b.isDraft ? " (Draft)" : ""}
                      </option>
                    ))
                  )}
                </select>
              )}

              {pageType === "product" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <IoSearchOutline
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Filter products..."
                      aria-label="Search products for preview"
                      className="w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 pl-8 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                    />
                  </div>
                  <select
                    aria-label="Select product to preview"
                    value={effectiveProdSlug}
                    onChange={(e) => {
                      setCustomPath("");
                      setFrameError("");
                      setFrameLoading(true);
                      setSelectedProductSlug(e.target.value);
                    }}
                    className="max-w-[250px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100"
                  >
                    {filteredProducts.length === 0 ? (
                      <option value="">No matching products</option>
                    ) : (
                      filteredProducts.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name}
                          {p.isDraft ? " (Draft)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 font-mono truncate max-w-md">
              <IoEyeOutline className="h-4 w-4 text-[#9B4F5E] shrink-0" aria-hidden="true" />
              <span className="truncate">{resolvedPath}</span>
            </div>
          )}

          {/* Device Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1"
              role="group"
              aria-label="Preview device viewport size"
            >
              {DEVICES.map((d) => {
                const Icon = d.icon;
                const active = device === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDevice(d.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xs"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <IoRefreshOutline
                className={`h-3.5 w-3.5 ${frameLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>

            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <IoOpenOutline className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sm:hidden md:inline">Open in new tab</span>
            </a>
          </div>
        </div>

        {/* Read-only Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-0.5 font-semibold text-amber-900 dark:text-amber-300">
              <IoLockClosedOutline className="h-3 w-3" aria-hidden="true" />
              Preview mode: read-only
            </span>
            <span>Orders, analytics, and chat widget are disabled inside this frame.</span>
          </div>
          {canPreviewDrafts && (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Draft preview active
            </span>
          )}
        </div>
      </div>

      {/* Centered Iframe Stage */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100/80 dark:bg-gray-950 p-2 sm:p-4 overflow-x-auto">
        <div
          className={`relative mx-auto transition-all duration-200 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white shadow-sm ${activeDeviceConfig.widthClass} ${heightClass}`}
        >
          {frameLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xs">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#9B4F5E] border-t-transparent" />
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Loading storefront preview...
              </p>
            </div>
          )}

          {frameError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-3 bg-white dark:bg-gray-900">
              <IoAlertCircleOutline className="h-8 w-8 text-rose-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Preview failed to load
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                {frameError}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#843F4E] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Storefront preview"
              onLoad={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setFrameError("");
                setFrameLoading(false);
              }}
              onError={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setFrameLoading(false);
                setFrameError("Unable to load the storefront frame.");
              }}
              className="h-full w-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

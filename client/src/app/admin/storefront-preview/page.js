"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { storefrontPreviewService } from "@/services/storefrontPreviewService";
import StorefrontPreviewFrame from "@/components/admin/preview/StorefrontPreviewFrame";
import { IoShieldOutline, IoRefreshOutline } from "react-icons/io5";

export default function AdminStorefrontPreviewPage() {
  const { isSuperAdmin, hasPermission, isLoading: authLoading } = useAuth();
  const hasViewAccess = isSuperAdmin || hasPermission("storefront.view");

  const [contextData, setContextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!hasViewAccess) {
      let active = true;
      Promise.resolve().then(() => {
        if (!active) return;
        setAccessDenied(true);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    let active = true;
    storefrontPreviewService
      .getAdminContext()
      .then((data) => {
        if (!active) return;
        setContextData(data);
        setAccessDenied(false);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 403 || err.status === 401) {
          setAccessDenied(true);
          setError(err.message || "Access denied.");
        } else {
          setError(err.message || "Failed to load storefront preview options.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, hasViewAccess, reloadKey]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="h-24 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
        <div className="h-[560px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3 rounded-3xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-gray-900 p-8 shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
          <IoShieldOutline className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Access denied</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          You need the <span className="font-mono font-semibold">storefront.view</span> permission
          from a Super Admin to open Storefront Preview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">
            Live Storefront
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Storefront Preview
          </h1>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1 font-semibold underline cursor-pointer"
          >
            <IoRefreshOutline className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}

      <StorefrontPreviewFrame
        collections={contextData?.collections || []}
        brands={contextData?.brands || []}
        products={contextData?.products || []}
        canPreviewDrafts={Boolean(contextData?.canPreviewDrafts)}
        showPageSelector={true}
      />
    </div>
  );
}

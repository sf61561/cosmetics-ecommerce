"use client";

import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/services/apiConfig";
import { IoEyeOutline, IoShieldCheckmarkOutline } from "react-icons/io5";

const StorefrontPreviewContext = createContext({
  isPreviewMode: false,
  canPreviewDrafts: false,
  isChecking: false,
  hasChecked: false,
  blockedNotice: "",
});

const PREVIEW_STORAGE_KEY = "eloura_preview_frame";

/**
 * Isolated query reader wrapped in its own <Suspense> so RootLayout {children} never suspend.
 */
function StorefrontPreviewQueryObserver({ onQueryPreviewChange }) {
  const searchParams = useSearchParams();
  const previewParam = searchParams?.get("preview");
  const hasPreviewQuery = previewParam === "1" || previewParam === "true";

  useEffect(() => {
    onQueryPreviewChange(hasPreviewQuery);
  }, [hasPreviewQuery, onQueryPreviewChange]);

  return null;
}

export function StorefrontPreviewProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isBackofficeRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/superadmin");

  const [hasPreviewQuery, setHasPreviewQuery] = useState(false);
  const [inIframeSession, setInIframeSession] = useState(false);
  const [verifiedState, setVerifiedState] = useState({
    authorized: false,
    canPreviewDrafts: false,
    isChecking: false,
    hasChecked: false,
  });
  const [blockedNotice, setBlockedNotice] = useState("");

  useEffect(() => {
    if (isBackofficeRoute) return;

    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    const storedFlag =
      typeof window !== "undefined" &&
      inIframe &&
      window.sessionStorage?.getItem(PREVIEW_STORAGE_KEY) === "1";

    const wantsPreview = hasPreviewQuery || storedFlag;
    if (!wantsPreview) return;

    let active = true;
    Promise.resolve().then(() => {
      if (active) setVerifiedState((prev) => ({ ...prev, isChecking: true }));
    });

    fetch(`${API_BASE}/api/storefront-preview/session`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const authorized = Boolean(json?.data?.authorized);
        const canPreviewDrafts = Boolean(json?.data?.canPreviewDrafts);

        if (authorized) {
          if (typeof window !== "undefined" && inIframe) {
            window.sessionStorage?.setItem(PREVIEW_STORAGE_KEY, "1");
            setInIframeSession(true);
          }
          setVerifiedState({
            authorized: true,
            canPreviewDrafts,
            isChecking: false,
            hasChecked: true,
          });
        } else {
          if (typeof window !== "undefined") {
            window.sessionStorage?.removeItem(PREVIEW_STORAGE_KEY);
          }
          setInIframeSession(false);
          setVerifiedState({
            authorized: false,
            canPreviewDrafts: false,
            isChecking: false,
            hasChecked: true,
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setInIframeSession(false);
        setVerifiedState({
          authorized: false,
          canPreviewDrafts: false,
          isChecking: false,
          hasChecked: true,
        });
      });

    return () => {
      active = false;
    };
  }, [isBackofficeRoute, hasPreviewQuery, pathname]);

  const isPreviewMode =
    !isBackofficeRoute && (hasPreviewQuery || inIframeSession) && verifiedState.authorized;
  const canPreviewDrafts = isPreviewMode && verifiedState.canPreviewDrafts;

  // Keep navigation inside the frame and block admin/superadmin links during preview
  useEffect(() => {
    if (!isPreviewMode) return;

    const handleClick = (event) => {
      const targetEl = event.target instanceof Element ? event.target : null;
      const anchor = targetEl?.closest("a[href]");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:")
      ) {
        return;
      }

      try {
        const parsed = new URL(rawHref, window.location.origin);
        if (parsed.origin !== window.location.origin) {
          event.preventDefault();
          event.stopPropagation();
          setBlockedNotice("External links are disabled in Storefront Preview.");
          setTimeout(() => setBlockedNotice(""), 3000);
          return;
        }

        if (parsed.pathname.startsWith("/admin") || parsed.pathname.startsWith("/superadmin")) {
          event.preventDefault();
          event.stopPropagation();
          setBlockedNotice("Admin routes are blocked inside Storefront Preview.");
          setTimeout(() => setBlockedNotice(""), 3000);
          return;
        }

        if (
          parsed.pathname.startsWith("/profile") ||
          parsed.pathname.startsWith("/orders") ||
          parsed.pathname.startsWith("/addresses") ||
          parsed.pathname.startsWith("/auth/")
        ) {
          event.preventDefault();
          event.stopPropagation();
          setBlockedNotice("Customer account & auth pages are disabled in Storefront Preview.");
          setTimeout(() => setBlockedNotice(""), 3000);
          return;
        }

        if (!parsed.searchParams.has("preview")) {
          event.preventDefault();
          parsed.searchParams.set("preview", "1");
          router.push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
        }
      } catch {
        // Ignore malformed links
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isPreviewMode, router]);

  return (
    <StorefrontPreviewContext.Provider
      value={{
        isPreviewMode,
        canPreviewDrafts,
        isChecking: verifiedState.isChecking,
        hasChecked: verifiedState.hasChecked,
        blockedNotice,
      }}
    >
      <Suspense fallback={null}>
        <StorefrontPreviewQueryObserver onQueryPreviewChange={setHasPreviewQuery} />
      </Suspense>
      {isPreviewMode && (
        <div
          role="status"
          className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/80 bg-amber-50 px-4 py-2 text-xs text-amber-950 shadow-2xs"
        >
          <div className="flex items-center gap-2 font-medium">
            <IoEyeOutline className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span>Preview mode. Orders and tracking are disabled.</span>
            {canPreviewDrafts && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
                <IoShieldCheckmarkOutline className="h-3 w-3" aria-hidden="true" />
                Draft items visible
              </span>
            )}
          </div>
          {blockedNotice && (
            <span className="font-semibold text-rose-700">{blockedNotice}</span>
          )}
        </div>
      )}
      {children}
    </StorefrontPreviewContext.Provider>
  );
}

export function useStorefrontPreview() {
  return useContext(StorefrontPreviewContext);
}

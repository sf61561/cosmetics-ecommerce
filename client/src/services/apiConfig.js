/**
 * API Configuration Helper
 * In the browser: uses relative path "" to leverage Next.js rewrites (`/api/*`).
 * This ensures all cookies (accessToken, refreshToken) are stored directly on the frontend domain
 * (First-Party cookies), eliminating third-party cookie rejections and enabling Next.js Edge proxy authentication.
 * On the server (SSR): uses absolute NEXT_PUBLIC_API_URL so Node fetch can reach the backend.
 */
export const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    : "";

export function isStorefrontPreviewActive() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1" || params.get("preview") === "true") {
      return true;
    }
    return window.sessionStorage?.getItem("eloura_preview_frame") === "1" && window.self !== window.top;
  } catch {
    return false;
  }
}

export function withPreviewParam(url) {
  if (!isStorefrontPreviewActive()) return url;
  const separator = url.includes("?") ? "&" : "?";
  return url.includes("preview=") ? url : `${url}${separator}preview=1`;
}

export function getPublicFetchOptions(extra = {}) {
  if (!isStorefrontPreviewActive()) {
    return { cache: "no-store", ...extra };
  }
  return {
    cache: "no-store",
    credentials: "include",
    ...extra,
    headers: {
      Accept: "application/json",
      "X-Storefront-Preview": "1",
      ...(extra.headers || {}),
    },
  };
}

export default API_BASE;


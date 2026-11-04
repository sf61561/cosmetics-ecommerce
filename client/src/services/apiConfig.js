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

export default API_BASE;


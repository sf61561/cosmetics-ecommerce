import { NextResponse } from "next/server";

/**
 * Helper to decode JWT payload without external library dependencies
 * (Safe for Next.js Edge / Proxy runtime)
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonString = atob(base64);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const isProfilePath = pathname.startsWith("/profile") || pathname.startsWith("/addresses") || pathname.startsWith("/orders");
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/register";

  // Reverse case: redirect authenticated users away from login/register to their dashboard or home
  if (isAuthPage) {
    const accessToken = request.cookies.get("accessToken")?.value;
    if (accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (payload?.role === "CUSTOMER") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // Protect account and administrative routes at the page boundary
  if (isAdminPath || isProfilePath) {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Let the client session check refresh an expired access token when possible.
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/auth/login", request.url);
      if (!isAdminPath) {
        loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      }
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (isAdminPath) {
        redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        redirectResponse.headers.set("Pragma", "no-cache");
        redirectResponse.headers.set("Expires", "0");
      }
      return redirectResponse;
    }

    // Admin routes require an ADMIN token. Customer account routes allow any signed-in user.
    if (isAdminPath && accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload) {
        // If user is NOT an ADMIN (e.g. CUSTOMER) -> Block and redirect to home
        if (payload.role !== "ADMIN") {
          const forbiddenResponse = NextResponse.redirect(new URL("/", request.url));
          forbiddenResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
          forbiddenResponse.headers.set("Pragma", "no-cache");
          forbiddenResponse.headers.set("Expires", "0");
          return forbiddenResponse;
        }
      }
    }

    const response = NextResponse.next();
    if (isAdminPath) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/addresses/:path*", "/orders/:path*", "/auth/login", "/auth/register"],
};


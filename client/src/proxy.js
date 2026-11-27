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
  const isSuperadminPath = pathname.startsWith("/superadmin");
  const isAdminPath = pathname.startsWith("/admin");
  const isProfilePath = pathname.startsWith("/profile") || pathname.startsWith("/addresses") || pathname.startsWith("/orders");
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/register";

  // Reverse case: redirect authenticated users away from login/register to their exact role home
  if (isAuthPage) {
    const accessToken = request.cookies.get("accessToken")?.value;
    if (accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload?.role === "SUPERADMIN") {
        return NextResponse.redirect(new URL("/superadmin", request.url));
      } else if (payload?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (payload?.role === "CUSTOMER") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // Strict 3-role page boundary enforcement
  if (isSuperadminPath || isAdminPath || isProfilePath) {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;
    const isProtectedBackoffice = isSuperadminPath || isAdminPath;

    // Let the client session check refresh an expired access token when possible.
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/auth/login", request.url);
      if (!isProtectedBackoffice) {
        loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      }
      const redirectResponse = NextResponse.redirect(loginUrl);
      if (isProtectedBackoffice) {
        redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        redirectResponse.headers.set("Pragma", "no-cache");
        redirectResponse.headers.set("Expires", "0");
      }
      return redirectResponse;
    }

    if (accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload?.role) {
        // 1. /superadmin/* -> strictly SUPERADMIN only
        if (isSuperadminPath && payload.role !== "SUPERADMIN") {
          const dest = payload.role === "ADMIN" ? "/admin" : "/";
          const forbiddenResponse = NextResponse.redirect(new URL(dest, request.url));
          forbiddenResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
          forbiddenResponse.headers.set("Pragma", "no-cache");
          forbiddenResponse.headers.set("Expires", "0");
          return forbiddenResponse;
        }

        // 2. /admin/* -> ADMIN or SUPERADMIN only
        if (isAdminPath && payload.role !== "ADMIN" && payload.role !== "SUPERADMIN") {
          const forbiddenResponse = NextResponse.redirect(new URL("/", request.url));
          forbiddenResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
          forbiddenResponse.headers.set("Pragma", "no-cache");
          forbiddenResponse.headers.set("Expires", "0");
          return forbiddenResponse;
        }

        // 3. /profile, /orders, /addresses -> strictly CUSTOMER only
        if (isProfilePath && payload.role !== "CUSTOMER") {
          const dest = payload.role === "SUPERADMIN" ? "/superadmin" : payload.role === "ADMIN" ? "/admin" : "/";
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }
    }

    const response = NextResponse.next();
    if (isProtectedBackoffice) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*", "/admin/:path*", "/profile/:path*", "/addresses/:path*", "/orders/:path*", "/auth/login", "/auth/register"],
};


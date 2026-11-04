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

  // Protect account routes at the page boundary; APIs still authenticate independently.
  if (isAdminPath || isProfilePath) {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Let the client session check refresh an expired access token when possible.
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes require an ADMIN token. Customer account routes allow any signed-in user.
    if (isAdminPath && accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload) {
        // If user is NOT an ADMIN (e.g. CUSTOMER) -> Block and redirect to home
        if (payload.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/addresses/:path*", "/orders/:path*"],
};


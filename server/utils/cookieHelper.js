/**
 * Cookie Configuration Helper
 * Configures HTTP-only session cookies with dynamic SameSite/Secure attributes:
 * - In production (Render, Vercel, HTTPS): `sameSite: "none"`, `secure: true` to allow cross-site cookie delivery.
 * - In local development (HTTP): `sameSite: "lax"`, `secure: false` to comply with browser HTTP restrictions.
 */

function isProductionOrCrossDomain() {
  return process.env.NODE_ENV === "production" || process.env.COOKIE_CROSS_DOMAIN === "true";
}

function getSessionCookieOptions(maxAge) {
  const isCrossDomain = isProductionOrCrossDomain();
  return {
    httpOnly: true,
    secure: isCrossDomain,
    sameSite: isCrossDomain ? "none" : "lax",
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function getClearCookieOptions() {
  const isCrossDomain = isProductionOrCrossDomain();
  return {
    httpOnly: true,
    secure: isCrossDomain,
    sameSite: isCrossDomain ? "none" : "lax",
    path: "/",
  };
}

module.exports = {
  isProductionOrCrossDomain,
  getSessionCookieOptions,
  getClearCookieOptions,
};


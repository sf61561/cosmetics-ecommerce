const { verifyAccessToken } = require("../utils/jwtHelper");
const authService = require("../services/authService");
const userRepository = require("../repositories/userRepository");
const auditService = require("../services/auditService");
const { getSessionCookieOptions } = require("../utils/cookieHelper");

async function logDenied(req, reason) {
  const targetUrl = String(req.originalUrl || req.path || "");
  if (!targetUrl.startsWith("/api/admin") && !targetUrl.startsWith("/api/superadmin") && !targetUrl.startsWith("/superadmin")) return;
  await auditService.recordBestEffort({
    actor: req.user || { role: "ANONYMOUS" },
    action: "ACCESS_DENIED",
    entityType: "SYSTEM",
    metadata: { reason, method: req.method, path: String(req.path || "").slice(0, 160) },
  }, { request: req.auditRequest });
}

/**
 * Authentication Middleware:
 * Verifies JWT access token strictly from HTTP-only cookie (with Authorization header fallback)
 */
async function authenticate(req, res, next) {
  // Prevent browser caching of protected responses
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await userRepository.findById(decoded.id);
        if (!user) {
          await logDenied(req, "USER_NOT_FOUND");
          return res.status(401).json({
            success: false,
            message: "User not found or account was removed.",
          });
        }

        if (user.status === "BLOCKED" || user.status === "SUSPENDED" || user.status === "DISABLED" || user.status === "INVITED") {
          await logDenied(req, "ACCOUNT_NOT_ACTIVE");
          return res.status(403).json({
            success: false,
            code: "ACCOUNT_NOT_ACTIVE",
            message: user.status === "INVITED"
              ? "Your invitation is pending. Please verify your email to set your password."
              : user.status === "DISABLED"
              ? "Your administrative account has been disabled. Please contact the Super Admin."
              : "Your account has been suspended or blocked. Please contact support.",
          });
        }

        req.user = {
          ...decoded,
          role: user.role,
          status: user.status,
          email: user.email,
          name: user.name,
        };
        return next();
      } catch (tokenErr) {
        if (tokenErr.name !== "TokenExpiredError") {
          await logDenied(req, "INVALID_TOKEN");
          return res.status(401).json({
            success: false,
            message: "Invalid authentication token. Please sign in again.",
          });
        }
      }
    }

    // If access token was missing or expired, attempt seamless refresh via refreshToken cookie
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const result = await authService.refreshAccessToken(refreshToken);
        // Re-issue access token cookie
        res.cookie("accessToken", result.accessToken, getSessionCookieOptions(15 * 60 * 1000));
        res.cookie("refreshToken", result.refreshToken, getSessionCookieOptions(result.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));

        const decoded = verifyAccessToken(result.accessToken);
        req.user = {
          ...decoded,
          role: result.user?.role || decoded.role,
          email: result.user?.email || decoded.email,
          name: result.user?.name || decoded.name,
        };
        return next();
      } catch {
        // Refresh token was invalid or expired
      }
    }

    await logDenied(req, "AUTH_REQUIRED");
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      message: "Authentication required. Please sign in.",
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please sign in again.",
    });
  }
}

/**
 * Role-based authorization guard
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logDenied(req, "INSUFFICIENT_ROLE");
      return res.status(403).json({
        success: false,
        message: "Access forbidden. Insufficient permissions.",
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};

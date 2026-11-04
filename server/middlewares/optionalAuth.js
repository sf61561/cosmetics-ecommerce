const crypto = require("crypto");
const { verifyAccessToken } = require("../utils/jwtHelper");
const authService = require("../services/authService");

/**
 * Optional Authentication & Anonymous Session Middleware:
 * 1. Checks if customer is authenticated via JWT HttpOnly cookie or Bearer header.
 * 2. If authenticated, attaches decoded user to `req.user`.
 * 3. If unauthenticated, extracts or generates a secure `eloura_session_id` cookie for guest personalization.
 */
async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch (tokenErr) {
        if (tokenErr.name === "TokenExpiredError") {
          // Attempt silent refresh via refreshToken
          const refreshToken = req.cookies?.refreshToken;
          if (refreshToken) {
            try {
              const result = await authService.refreshAccessToken(refreshToken);
              const isProd = process.env.NODE_ENV === "production";
              res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: "lax",
                path: "/",
                maxAge: 15 * 60 * 1000,
              });
              req.user = verifyAccessToken(result.accessToken);
            } catch {
              req.user = null;
            }
          }
        } else {
          req.user = null;
        }
      }
    } else {
      req.user = null;
    }

    // Guest Session Management
    let sessionId = req.cookies?.eloura_session_id || req.headers["x-session-id"];
    if (!sessionId || typeof sessionId !== "string" || sessionId.length < 10) {
      sessionId = crypto.randomUUID();
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("eloura_session_id", sessionId, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    req.sessionId = sessionId;
    next();
  } catch (err) {
    req.user = null;
    req.sessionId = crypto.randomUUID();
    next();
  }
}

module.exports = optionalAuth;


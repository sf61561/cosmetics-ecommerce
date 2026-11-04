const oauthService = require("../services/oauthService");
const providerRepository = require("../repositories/providerRepository");
const crypto = require("crypto");

const RECENT_AUTH_SECONDS = 5 * 60;

function clientOrigin() {
  const configured = process.env.CLIENT_URL || "http://localhost:3000";
  return new URL(configured).origin;
}

function safeClientPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.length > 2048) {
    return fallback;
  }
  try {
    const target = new URL(value, clientOrigin());
    if (target.origin !== clientOrigin() || target.pathname.startsWith("/admin")) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

function clientUrl(path) {
  return new URL(safeClientPath(path), clientOrigin());
}

function oauthStateCookieName(state) {
  if (typeof state !== "string" || !/^[A-Za-z0-9_-]{40,60}$/.test(state)) return null;
  const digest = crypto.createHash("sha256").update(state).digest("hex").slice(0, 24);
  return `oauth_state_${digest}`;
}

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/oauth",
    maxAge: 10 * 60 * 1000,
  };
}

function requireSameOrigin(req) {
  const origin = req.get("origin");
  const allowed = new Set([clientOrigin()]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }
  if (!origin || !allowed.has(origin)) {
    const error = new Error("This request could not be verified. Refresh the page and try again.");
    error.statusCode = 403;
    error.code = "ORIGIN_NOT_ALLOWED";
    throw error;
  }
}

function requireRecentAuthentication(req) {
  const authTime = Number(req.user?.auth_time);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authTime) || authTime > now + 30 || now - authTime > RECENT_AUTH_SECONDS) {
    const error = new Error("Sign in again before changing your linked sign-in methods.");
    error.statusCode = 401;
    error.code = "RECENT_AUTH_REQUIRED";
    throw error;
  }
}

function safeErrorCode(error) {
  const allowed = new Set([
    "ACCOUNT_LINK_REQUIRED", "PROVIDER_ALREADY_LINKED", "PROVIDER_NOT_LINKED",
    "LAST_AUTH_METHOD", "RECENT_AUTH_REQUIRED", "OAUTH_STATE_INVALID",
    "OAUTH_CANCELLED", "OAUTH_FAILED", "OAUTH_PROVIDER_UNAVAILABLE",
    "ACCOUNT_BLOCKED", "ACCOUNT_UNAVAILABLE", "ORIGIN_NOT_ALLOWED",
  ]);
  return allowed.has(error?.code) ? error.code : "OAUTH_FAILED";
}

function setSessionCookies(res, result) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

class OAuthController {
  getProviders(req, res, next) {
    try {
      return res.json({ success: true, providers: oauthService.listSupportedProviders() });
    } catch (error) {
      return next(error);
    }
  }

  async initiate(req, res, next) {
    try {
      const providerName = String(req.params.provider || "").toLowerCase();
      const returnTo = safeClientPath(req.query.redirect, "/");
      const flow = await oauthService.startFlow({ providerName, flowType: "LOGIN", returnTo });
      res.cookie(oauthStateCookieName(flow.state), flow.state, oauthStateCookieOptions());
      return res.redirect(flow.authorizationUrl);
    } catch (error) {
      const destination = clientUrl("/auth/login");
      destination.searchParams.set("error", safeErrorCode(error));
      return res.redirect(destination.toString());
    }
  }

  async callback(req, res) {
    let flow = null;
    const providerName = String(req.params.provider || "").toLowerCase();
    try {
      const state = req.query.state;
      const cookieName = oauthStateCookieName(state);
      const stateCookieMatches = Boolean(cookieName && req.cookies?.[cookieName] === state);
      if (cookieName) {
        const { maxAge, ...clearOptions } = oauthStateCookieOptions();
        res.clearCookie(cookieName, clearOptions);
      }
      if (!stateCookieMatches) {
        const error = new Error("OAuth state is missing or invalid. Start sign-in again.");
        error.code = "OAUTH_STATE_INVALID";
        error.statusCode = 400;
        throw error;
      }
      flow = await oauthService.consumeFlow(providerName, state);
      if (req.query.error) {
        const error = new Error("OAuth sign-in was cancelled.");
        error.code = "OAUTH_CANCELLED";
        error.statusCode = 400;
        throw error;
      }

      const result = await oauthService.handleCallback(providerName, req.query.code, flow, req.auditRequest);
      if (result.flowType === "LINK") {
        const destination = clientUrl(result.returnTo || "/profile/security");
        destination.searchParams.set("providerLinked", result.provider);
        return res.redirect(destination.toString());
      }

      setSessionCookies(res, result);
      if (result.user?.role === "ADMIN") return res.redirect(new URL("/admin", clientOrigin()).toString());
      return res.redirect(clientUrl(safeClientPath(result.returnTo, "/")).toString());
    } catch (error) {
      const destination = flow?.flow_type === "LINK"
        ? clientUrl(flow.return_to || "/profile/security")
        : clientUrl("/auth/login");
      destination.searchParams.set(flow?.flow_type === "LINK" ? "providerLinkError" : "error", safeErrorCode(error));
      return res.redirect(destination.toString());
    }
  }

  async linkProvider(req, res, next) {
    try {
      requireSameOrigin(req);
      requireRecentAuthentication(req);
      const providerName = String(req.params.provider || "").toLowerCase();
      const linkedProviders = await providerRepository.listForUser(req.user.id);
      if (linkedProviders.some((item) => item.provider === providerName)) {
        const error = new Error("This provider is already linked to your account.");
        error.statusCode = 409;
        error.code = "PROVIDER_ALREADY_LINKED";
        throw error;
      }
      const flow = await oauthService.startFlow({
        providerName,
        flowType: "LINK",
        userId: req.user.id,
        returnTo: "/profile/security",
      });
      res.cookie(oauthStateCookieName(flow.state), flow.state, oauthStateCookieOptions());
      return res.json({ success: true, authorizationUrl: flow.authorizationUrl });
    } catch (error) {
      return next(error);
    }
  }

  async unlinkProvider(req, res, next) {
    try {
      requireSameOrigin(req);
      requireRecentAuthentication(req);
      const provider = String(req.params.provider || "").toLowerCase();
      const result = await oauthService.unlinkIdentity({ userId: req.user.id, providerName: provider, request: req.auditRequest });
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new OAuthController();

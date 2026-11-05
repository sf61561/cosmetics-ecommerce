const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for registration endpoint
 * Limits an IP address to 5 registration requests per 15-minute window
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      message:
        "Too many registration attempts from this IP address. Please try again after 15 minutes.",
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) + " minutes",
    });
  },
});

/**
 * Rate limiter for interaction tracking endpoint
 * Limits an IP address to 60 interaction logs per 1-minute window
 */
const interactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 events per minute
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      message: "Too many interaction tracking events. Please slow down.",
    });
  },
});

const profileAvatarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    message: "Too many profile photo updates. Please try again later.",
  }),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "LOGIN_RATE_LIMITED",
    message: "Too many sign-in attempts. Please wait and try again.",
  }),
});

const passwordSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    message: "Too many password setup requests. Please try again later.",
  }),
});

const passwordSetupCompleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    message: "Too many password setup attempts. Request a new link and try again.",
  }),
});

const providerLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    message: "Too many provider-linking attempts. Please try again later.",
  }),
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    message: "Too many password changes. Please try again later.",
  }),
});

/**
 * Rate limiter for the resend-verification endpoint.
 * Allows 5 requests per 15-minute window per IP to prevent email bombing.
 */
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "RESEND_RATE_LIMITED",
    message: "Too many verification email requests. Please wait 15 minutes before trying again.",
    retryAfter: "15 minutes",
  }),
});

/**
 * Rate limiter for the refresh-token endpoint.
 * Allows 30 requests per minute per IP — generous enough for normal SPAs
 * while blocking brute-force or token-exhaustion attacks.
 */
const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "REFRESH_RATE_LIMITED",
    message: "Too many token refresh requests. Please slow down.",
  }),
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "PASSWORD_RESET_RATE_LIMITED",
    message: "Too many password reset requests. Please try again later.",
  }),
});

const passwordResetCompleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "PASSWORD_RESET_COMPLETE_RATE_LIMITED",
    message: "Too many password reset attempts. Please request a new link and try again.",
  }),
});

/**
 * Rate limiter for email verification endpoints (GET/POST /verify-email)
 * Allows up to 30 attempts per 15 minutes per IP to prevent token enumeration.
 */
const emailVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "VERIFY_RATE_LIMITED",
    message: "Too many verification requests. Please wait a few minutes before trying again.",
  }),
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => res.status(options.statusCode).json({
    success: false,
    code: "SEARCH_RATE_LIMITED",
    message: "Too many search requests. Please wait a moment before trying again.",
  }),
});

module.exports = {
  registerLimiter,
  interactionLimiter,
  profileAvatarLimiter,
  loginLimiter,
  passwordSetupLimiter,
  passwordSetupCompleteLimiter,
  passwordChangeLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
  passwordResetLimiter,
  passwordResetCompleteLimiter,
  emailVerifyLimiter,
  searchLimiter,
};


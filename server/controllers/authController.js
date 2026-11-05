const authService = require("../services/authService");
const auditService = require("../services/auditService");
const { getSessionCookieOptions, getClearCookieOptions } = require("../utils/cookieHelper");

function clearSessionCookies(res) {
  const options = getClearCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
  res.clearCookie("accessToken", { path: "/", sameSite: "lax" });
  res.clearCookie("refreshToken", { path: "/", sameSite: "lax" });
}

class AuthController {
  /**
   * Handle user registration
   */
  async register(req, res, next) {
    try {
      const dataToRegister = req.sanitizedData || req.body;
      const user = await authService.registerUser(dataToRegister);

      let message = "Account created successfully.";
      if (user.emailVerificationRequired) {
        if (user.verificationEmailSent) {
          message = "Account created successfully! We sent a verification link to your email.";
        } else if (user.emailDeliveryError) {
          message = `Account created, but verification email could not be sent: ${user.emailDeliveryError}`;
        }
      }

      return res.status(201).json({
        success: true,
        message,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle email verification
   */
  async verifyEmail(req, res, next) {
    try {
      const token = req.query.token || req.body.token;
      const result = await authService.verifyEmail(token, req.auditRequest);

      const message = result.alreadyVerified
        ? "Your email address is already verified! You can proceed to log in."
        : "Your email has been verified successfully! You can now log in.";

      return res.status(200).json({
        success: true,
        alreadyVerified: Boolean(result.alreadyVerified),
        message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle resending verification email
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordSetup(req, res, next) {
    try {
      const result = await authService.requestPasswordSetup(req.body?.email);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async completePasswordSetup(req, res, next) {
    try {
      const result = await authService.completePasswordSetup(req.body || {}, req.auditRequest);
      clearSessionCookies(res);
      return res.status(200).json({ success: true, message: "Password set. Sign in with your email and password.", data: result });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const result = await authService.requestPasswordReset(req.body?.email);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async completePasswordReset(req, res, next) {
    try {
      const result = await authService.completePasswordReset(req.body || {}, req.auditRequest);
      clearSessionCookies(res);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async validateResetToken(req, res, next) {
    try {
      const token = req.query.token || req.body.token;
      const result = await authService.validatePasswordResetToken(token);
      return res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  }
  /**
   * Handle user login
   */
  /**
   * Handle user login
   */
  async login(req, res, next) {
    try {
      const { identifier, password, rememberMe } = req.body;
      const result = await authService.loginUser({
        identifier,
        password,
        rememberMe: Boolean(rememberMe),
      }, req.auditRequest);

      const refreshMaxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000; // 7 days

      // Set secure HTTP-only accessToken cookie (15m)
      res.cookie("accessToken", result.accessToken, getSessionCookieOptions(15 * 60 * 1000));

      // Set secure HTTP-only refreshToken cookie
      res.cookie("refreshToken", result.refreshToken, getSessionCookieOptions(refreshMaxAge));

      // Respond without exposing tokens to frontend JavaScript
      return res.status(200).json({
        success: true,
        message: "Login successful.",
        user: result.user,
      });
    } catch (error) {
      await auditService.recordBestEffort({
        actor: { role: "ANONYMOUS" },
        action: "LOGIN_FAILED",
        entityType: "USER",
        metadata: { reason: error.code || (error.statusCode === 401 ? "INVALID_CREDENTIALS" : "LOGIN_REJECTED") },
      }, { request: req.auditRequest });
      next(error);
    }
  }

  /**
   * Handle refresh token request
   */
  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshAccessToken(token);

      const isProd = process.env.NODE_ENV === "production";

      // Re-issue HTTP-only accessToken cookie
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: result.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully.",
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle logout
   */
  async logout(req, res, next) {
    try {
      let token = req.cookies?.refreshToken;
      let decoded = null;
      if (token) {
        try {
          const { verifyRefreshToken } = require("../utils/jwtHelper");
          decoded = verifyRefreshToken(token);
        } catch {
          // Token decode error ignored on logout
        }
      }
      if (!decoded?.id && req.cookies?.accessToken) {
        try {
          const { verifyAccessToken } = require("../utils/jwtHelper");
          decoded = verifyAccessToken(req.cookies.accessToken);
        } catch {}
      }
      if (decoded?.id) {
        await authService.logoutUser(decoded.id, { id: decoded.id, role: decoded.role }, req.auditRequest);
      }

      // Explicitly set no-cache headers on logout response to prevent browser back-cache
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      });

      // Clear both HTTP-only cookies across all configurations
      clearSessionCookies(res);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

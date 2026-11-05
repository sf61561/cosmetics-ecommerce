const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateRegister } = require("../validators/authValidator");
const {
  registerLimiter,
  loginLimiter,
  passwordSetupLimiter,
  passwordSetupCompleteLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
  passwordResetLimiter,
  passwordResetCompleteLimiter,
  emailVerifyLimiter,
} = require("../middlewares/rateLimiter");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Middleware that handles optional direct multipart/form-data file uploads
 * on the registration endpoint. If an image file is attached in FormData,
 * it uploads it directly to Cloudinary and populates req.body with the URLs.
 */
const handleRegisterUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "avatar", maxCount: 1 },
    ])(req, res, async (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Profile picture exceeds the 5 MB limit.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to process uploaded file.",
        });
      }

      const file = req.files?.image?.[0] || req.files?.avatar?.[0];
      if (file) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "eloura/avatars",
                resource_type: "image",
                fetch_format: "auto",
                quality: "auto",
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            Readable.from(file.buffer).pipe(stream);
          });

          req.body.profile_picture_link = uploadResult.secure_url;
          req.body.profile_picture_public_id = uploadResult.public_id;
        } catch (uploadErr) {
          console.error("Cloudinary upload error in register:", uploadErr);
          return res.status(500).json({
            success: false,
            message: "Failed to upload profile picture to Cloudinary.",
          });
        }
      }
      next();
    });
  } else {
    next();
  }
};

// POST /api/auth/register (rate-limited, handles multipart or json, validated)
router.post(
  "/register",
  registerLimiter,
  handleRegisterUpload,
  validateRegister,
  (req, res, next) => authController.register(req, res, next)
);

// POST /api/auth/login (access token & refresh token)
router.post("/login", loginLimiter, (req, res, next) =>
  authController.login(req, res, next)
);

router.post("/password/setup/request", passwordSetupLimiter, (req, res, next) =>
  authController.requestPasswordSetup(req, res, next)
);

router.post("/password/setup/complete", passwordSetupCompleteLimiter, (req, res, next) =>
  authController.completePasswordSetup(req, res, next)
);

router.post("/password/reset/request", passwordResetLimiter, (req, res, next) =>
  authController.requestPasswordReset(req, res, next)
);

router.post("/password/reset/complete", passwordResetCompleteLimiter, (req, res, next) =>
  authController.completePasswordReset(req, res, next)
);

// Pre-validate password reset token on page load
router.get("/password/reset/validate", (req, res, next) =>
  authController.validateResetToken(req, res, next)
);

// Route aliases specified in forgot-password flow spec:
// POST /api/auth/forgot-password (alias for /password/reset/request)
router.post("/forgot-password", passwordResetLimiter, (req, res, next) =>
  authController.requestPasswordReset(req, res, next)
);

// POST /api/auth/reset-password (alias for /password/reset/complete)
router.post("/reset-password", passwordResetCompleteLimiter, (req, res, next) =>
  authController.completePasswordReset(req, res, next)
);

// GET /api/auth/reset-password/validate (alias for /password/reset/validate)
router.get("/reset-password/validate", (req, res, next) =>
  authController.validateResetToken(req, res, next)
);

// POST /api/auth/refresh-token (refresh access token)
router.post("/refresh-token", refreshTokenLimiter, (req, res, next) =>
  authController.refreshToken(req, res, next)
);

// POST /api/auth/logout (clear tokens & session)
router.post("/logout", (req, res, next) =>
  authController.logout(req, res, next)
);

// GET /api/auth/me (get current authenticated user)
router.get("/me", authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

// GET & POST /api/auth/verify-email (rate-limited)
router.get("/verify-email", emailVerifyLimiter, (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

router.post("/verify-email", emailVerifyLimiter, (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

// POST /api/auth/resend-verification
router.post("/resend-verification", resendVerificationLimiter, (req, res, next) =>
  authController.resendVerification(req, res, next)
);

module.exports = router;

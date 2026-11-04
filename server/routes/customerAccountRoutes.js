const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const { query, getClient } = require("../config/db");
const customerRepository = require("../repositories/customerRepository");
const auditService = require("../services/auditService");
const upload = require("../middlewares/upload");
const cloudinaryService = require("../services/cloudinaryService");
const { profileAvatarLimiter, passwordChangeLimiter } = require("../middlewares/rateLimiter");
const providerRepository = require("../repositories/providerRepository");
const oauthService = require("../services/oauthService");
const notificationService = require("../services/notificationService");

const router = express.Router();
router.use(authenticate);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireCustomerOrigin(req) {
  const configuredOrigin = new URL(process.env.CLIENT_URL || "http://localhost:3000").origin;
  const allowedOrigins = new Set([configuredOrigin]);
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
  }
  if (!req.get("origin") || !allowedOrigins.has(req.get("origin"))) {
    const error = new Error("This request could not be verified. Refresh the page and try again.");
    error.status = 403;
    error.code = "ORIGIN_NOT_ALLOWED";
    throw error;
  }
}

router.get("/overview", async (req, res, next) => {
  try {
    const [orders, orderCount, wishlist, addressCount] = await Promise.all([
      query(
        `SELECT id, order_number, created_at, total_amount, order_status
         FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [req.user.id]
      ),
      query("SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1", [req.user.id]),
      query(
        `SELECT COUNT(*)::int AS count
         FROM wishlist_items WHERE user_id = $1`,
        [req.user.id]
      ),
      query("SELECT COUNT(*)::int AS count FROM addresses WHERE user_id = $1", [req.user.id]),
    ]);

    res.json({
      success: true,
      data: {
        recentOrders: orders.rows.map((order) => ({
          id: order.id,
          orderNumber: order.order_number,
          createdAt: order.created_at,
          totalAmount: Number(order.total_amount),
          orderStatus: order.order_status,
        })),
        orderCount: orderCount.rows[0]?.count || 0,
        wishlistCount: wishlist.rows[0]?.count || 0,
        addressCount: addressCount.rows[0]?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/security", requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const result = await query(
      "SELECT password_hash FROM users WHERE id = $1 AND role = 'CUSTOMER' LIMIT 1",
      [req.user.id]
    );
    if (!result.rows[0]) {
      const error = new Error("Customer account not found.");
      error.status = 404;
      throw error;
    }
    return res.json({
      success: true,
      data: {
        hasPassword: Boolean(result.rows[0].password_hash),
        providers: await providerRepository.listForUser(req.user.id),
        supportedProviders: oauthService.listSupportedProviders(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/profile/avatar", profileAvatarLimiter, (req, res, next) => {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE" ? "Profile photo must be 5 MB or smaller." : error.message || "Unable to read the selected image.",
    });
  });
}, async (req, res, next) => {
  let uploaded = null;
  let committed = false;
  try {
    if (!req.file) throw validationError("Choose an image to upload.");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(req.file.mimetype)) {
      throw validationError("Choose a JPEG, PNG, WebP, or GIF image.");
    }

    uploaded = await cloudinaryService.uploadImage(req.file.buffer, "rupkotha/avatars");
    const client = await getClient();
    let previousPublicId = null;
    let updatedUser;
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT profile_picture_public_id FROM users WHERE id = $1 AND role = 'CUSTOMER' FOR UPDATE",
        [req.user.id]
      );
      if (!current.rows[0]) {
        const error = new Error("Customer account not found.");
        error.status = 404;
        throw error;
      }
      previousPublicId = current.rows[0].profile_picture_public_id;
      const result = await client.query(
        `UPDATE users
         SET profile_picture_link = $1, profile_picture_public_id = $2, updated_at = NOW()
         WHERE id = $3 AND role = 'CUSTOMER'
         RETURNING id, name, email, phone, role, profile_picture_link, email_verified_at, authprovider, created_at`,
        [uploaded.url, uploaded.publicId, req.user.id]
      );
      updatedUser = result.rows[0];
      await auditService.record({
        actor: req.user,
        action: "CUSTOMER_PROFILE_UPDATED",
        entityType: "USER",
        entityId: req.user.id,
        previousValues: { changedFields: [] },
        newValues: { changedFields: ["profilePicture"] },
        metadata: { changedFields: ["profilePicture"], source: "CUSTOMER_PROFILE" },
      }, { client, request: req.auditRequest });
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      await cloudinaryService.deleteImage(previousPublicId);
    }
    return res.json({
      success: true,
      message: "Profile photo updated successfully.",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profilePicture: updatedUser.profile_picture_link,
        emailVerified: Boolean(updatedUser.email_verified_at),
        authProvider: updatedUser.authprovider,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (error) {
    if (uploaded && !committed) await cloudinaryService.deleteImage(uploaded.publicId);
    next(error);
  }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (typeof name !== "string" || name.trim().length < 2) {
      throw validationError("Full name must contain at least 2 characters.");
    }
    if (phone !== undefined && phone !== null && phone !== "" && !/^(?:\+?88)?01[3-9]\d{8}$/.test(String(phone).replace(/\s|-/g, ""))) {
      throw validationError("Enter a valid Bangladesh phone number.");
    }
    const client = await getClient();
    let user;
    try {
      await client.query("BEGIN");
      const updatedFields = ["name", "phone"].filter((field) => req.body[field] !== undefined);
      user = await customerRepository.updateProfile(req.user.id, { name, phone }, client);
      if (updatedFields.length) {
        await auditService.record({
          actor: req.user,
          action: "CUSTOMER_PROFILE_UPDATED",
          entityType: "USER",
          entityId: req.user.id,
          previousValues: { changedFields: [] },
          newValues: { changedFields: updatedFields },
          metadata: { changedFields: updatedFields, source: "CUSTOMER_PROFILE" },
        }, { client, request: req.auditRequest });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.json({ success: true, message: "Profile updated successfully.", data: user });
  } catch (error) {
    next(error);
  }
});

router.patch("/password", passwordChangeLimiter, async (req, res, next) => {
  let client = null;
  let transactionStarted = false;
  try {
    requireCustomerOrigin(req);
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
      throw validationError("New password must be between 8 and 72 characters.");
    }
    if (newPassword !== confirmPassword) throw validationError("New passwords do not match.");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    client = await getClient();
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(
      `SELECT id, role, status, password_hash
       FROM users WHERE id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      const error = validationError("Customer account is not available.");
      error.status = 403;
      throw error;
    }

    if (user.password_hash) {
      if (!currentPassword) throw validationError("Enter your current password and matching new passwords.");
      if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
        const error = validationError("Current password is incorrect.");
        error.status = 401;
        throw error;
      }
    } else {
      const authTime = Number(req.user?.auth_time);
      const now = Math.floor(Date.now() / 1000);
      if (!Number.isFinite(authTime) || authTime > now + 30 || now - authTime > 5 * 60) {
        const error = new Error("Sign in with your linked provider again before setting a password.");
        error.status = 401;
        error.code = "RECENT_AUTH_REQUIRED";
        throw error;
      }
    }

    await client.query(
      `UPDATE users
       SET password_hash = $1, refresh_token = NULL, previous_refresh_token = NULL,
           refresh_token_rotated_at = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, req.user.id]
    );
    await auditService.record({
      actor: req.user,
      action: "PASSWORD_CHANGED",
      entityType: "USER",
      entityId: req.user.id,
      newValues: { changed: true },
      metadata: { method: user.password_hash ? "PASSWORD_CHANGE" : "OAUTH_ACCOUNT_SETUP" },
    }, { client, request: req.auditRequest });
    await client.query("COMMIT");
    transactionStarted = false;
    notificationService
      .notify("security.password_changed", {
        userId: req.user.id,
        data: { name: req.user.name, email: req.user.email },
      })
      .catch(() => {});
    res.clearCookie("accessToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return res.json({
      success: true,
      message: "Password saved. Please sign in again.",
      requiresLogin: true,
      data: { requiresLogin: true },
    });
  } catch (error) {
    if (client && transactionStarted) await client.query("ROLLBACK").catch(() => {});
    return next(error);
  } finally {
    if (client) client.release();
  }
});

router.get("/wishlist", async (req, res, next) => {
  try {
    const data = await customerRepository.getCustomerWishlist(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

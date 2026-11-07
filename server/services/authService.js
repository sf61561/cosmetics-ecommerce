const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const { getClient, query } = require("../config/db");
const auditService = require("./auditService");
const tokenRepository = require("../repositories/tokenRepository");
const emailService = require("./emailService");
const notificationService = require("./notificationService");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwtHelper");
require("dotenv").config();

class AuthService {
  /**
   * Register a new user and trigger email verification if email was provided
   */
  async registerUser({
    name,
    fullName,
    phone,
    email,
    password,
    profilePictureLink = null,
    profilePicturePublicId = null,
    agreedToTerms = true,
    authProvider = "local",
  }) {
    const resolvedName = (name || fullName || "").trim();
    email = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    if (!resolvedName) {
      const error = new Error("Full name is required.");
      error.statusCode = 400;
      error.field = "fullName";
      throw error;
    }

    if (password.length < 8 || password.length > 72) {
      const error = new Error("Password must be between 8 and 72 characters.");
      error.statusCode = 400;
      error.field = "password";
      throw error;
    }

    // 1. Check if an account with this phone number already exists
    const existingPhoneUser = await userRepository.findByPhone(phone);
    if (existingPhoneUser) {
      const error = new Error("An account with this phone number already exists.");
      error.statusCode = 409;
      error.field = "phone";
      throw error;
    }

    // 2. Check if an account with this email already exists (if email provided)
    if (email) {
      if (/^www\./i.test(email.trim())) {
        const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
        error.statusCode = 400;
        error.field = "email";
        throw error;
      }
      const existingEmailUser = await userRepository.findByEmail(email);
      if (existingEmailUser) {
        // Edge Case: If account was created with email/password, never verified,
        // and is older than 72 hours, purge the stale abandoned account so the legitimate email owner isn't blocked.
        const isStaleUnverified =
          !existingEmailUser.email_verified_at &&
          existingEmailUser.created_at &&
          Date.now() - new Date(existingEmailUser.created_at).getTime() > 72 * 60 * 60 * 1000;

        if (isStaleUnverified) {
          await userRepository.deleteUnverifiedUser(existingEmailUser.id);
        } else if (existingEmailUser.email_verified_at) {
          // Anti-enumeration: Verified account gets generic response + optional "account exists" security email
          await bcrypt.hash("dummy_constant_for_timing_normalization", 10);
          emailService
            .sendAccountExistsEmail({ to: email, name: existingEmailUser.name })
            .catch(() => {});
          return {
            success: true,
            generic: true,
            message: "Check your email to verify your account.",
            email: email,
            emailVerificationRequired: true,
            verificationEmailSent: true,
          };
        } else {
          // Account exists but is unverified (<72h): Resend fresh verification email and return generic response
          await this.resendVerificationEmail(email).catch(() => {});
          return {
            success: true,
            generic: true,
            message: "Check your email to verify your account.",
            email: email,
            emailVerificationRequired: true,
            verificationEmailSent: true,
          };
        }
      }
    }

    // 3. Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create customer in database
    const newUser = await userRepository.createUser({
      name: resolvedName,
      phone,
      email: email || null,
      passwordHash,
      role: "CUSTOMER",
      profilePictureLink,
      profilePicturePublicId,
      agreedToTerms,
      authProvider,
    });

    let verificationSent = false;

    // 5. If user provided an email, send email verification link via Resend
    if (newUser.email) {
      let verificationUrl = "";
      try {
        // Generate secure 32-byte token
        const rawToken = crypto.randomBytes(32).toString("hex");
        // Hash the token for secure storage
        const tokenHash = crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");

        // Token expires in 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store token hash in database
        await tokenRepository.createVerificationToken(
          newUser.id,
          tokenHash,
          expiresAt
        );

        // Construct verification URL
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        verificationUrl = `${clientUrl}/auth/verify-email?token=${rawToken}`;

        // Send email via Resend
        await emailService.sendVerificationEmail({
          to: newUser.email,
          name: newUser.name,
          verificationUrl,
        });

        verificationSent = true;
      } catch (emailErr) {
        console.error("Failed to send verification email during registration:", emailErr.message || emailErr);
        console.log("\n=======================================================");
        console.log("⚠️ EMAIL DELIVERY FAILED / BLOCKED BY RESEND");
        console.log("Recipient:", newUser.email);
        console.log("Error details:", emailErr.message);
        if (verificationUrl) {
          console.log("🔗 FALLBACK VERIFICATION LINK (for testing):");
          console.log(verificationUrl);
        }
        console.log("=======================================================\n");
        // Record error details so controller/client can be notified
        newUser.emailDeliveryError = emailErr.message;
      }
    }

    return {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role,
      profilePicture: newUser.profile_picture_link,
      createdAt: newUser.created_at,
      emailVerificationRequired: Boolean(newUser.email),
      verificationEmailSent: verificationSent,
      emailDeliveryError: newUser.emailDeliveryError || null,
    };
  }

  /**
   * Verify email using raw token from verification link
   */
  async verifyEmail(rawToken, request = null) {
    if (!rawToken || typeof rawToken !== "string") {
      const error = new Error("Verification token is missing or invalid.");
      error.statusCode = 400;
      throw error;
    }

    // Hash the token to compare with the database record
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken.trim())
      .digest("hex");

    // Look up token in database
    const tokenRecord = await tokenRepository.findVerificationToken(tokenHash);

    if (!tokenRecord) {
      const error = new Error(
        "Invalid verification link. Please check your email or request a new link."
      );
      error.statusCode = 400;
      error.code = "TOKEN_INVALID";
      throw error;
    }

    if (tokenRecord.used_at) {
      const existingUser = await userRepository.findById(tokenRecord.user_id);
      if (existingUser?.email_verified_at) {
        return {
          verified: true,
          alreadyVerified: true,
          userId: existingUser.id,
          email: existingUser.email,
          message: "Your email address is already verified. Please sign in.",
        };
      }
      const error = new Error("This verification link has already been used. Please sign in or request a new link.");
      error.statusCode = 400;
      error.code = "TOKEN_ALREADY_USED";
      throw error;
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      const error = new Error(
        "This verification link has expired. Please request a new verification email."
      );
      error.statusCode = 400;
      error.code = "TOKEN_EXPIRED";
      error.isExpired = true;
      throw error;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const userBefore = await client.query("SELECT id, role, email_verified_at FROM users WHERE id = $1 FOR UPDATE", [tokenRecord.user_id]);
      if (!userBefore.rows[0]) {
        const error = new Error("Verification account no longer exists.");
        error.statusCode = 404;
        throw error;
      }
      await tokenRepository.markTokenUsed(tokenRecord.id, client);
      // Clean up / invalidate any other unused verification tokens for this user
      await client.query(
        "UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [tokenRecord.user_id]
      );
      const updatedUser = await tokenRepository.markEmailVerified(tokenRecord.user_id, client);
      const wasAlreadyVerified = Boolean(userBefore.rows[0].email_verified_at);
      if (!wasAlreadyVerified) {
        await auditService.record({
          actor: { id: tokenRecord.user_id, role: userBefore.rows[0].role },
          action: "EMAIL_VERIFIED",
          entityType: "USER",
          entityId: tokenRecord.user_id,
          previousValues: { verified: false },
          newValues: { verified: true },
          metadata: { verificationMethod: "email_link" },
        }, { client, request });
      }
      await client.query("COMMIT");
      return {
        verified: true,
        alreadyVerified: Boolean(wasAlreadyVerified),
        userId: updatedUser.id,
        email: updatedUser.email,
        emailVerifiedAt: updatedUser.email_verified_at,
        message: "Your email has been verified successfully! You can now log in.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    const genericResponse = {
      success: true,
      message: "If this account needs verification, we've sent a new link.",
    };

    if (!email || typeof email !== "string") {
      const error = new Error("Email address is required.");
      error.statusCode = 400;
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (/^www\./i.test(normalizedEmail)) {
      const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      error.statusCode = 400;
      error.field = "email";
      throw error;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return genericResponse;
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Don't leak whether an account exists or not for security
      return genericResponse;
    }

    // Check if already verified
    const userDetails = await userRepository.findById(user.id);
    if (userDetails?.email_verified_at) {
      return {
        success: true,
        alreadyVerified: true,
        message: "This email address is already verified. Please sign in.",
      };
    }

    // Rate limit check per email/user: max 5 requests per hour
    const recentRequests = await query(
      `SELECT COUNT(*)::int AS count FROM email_verification_tokens
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.id]
    );
    if ((recentRequests.rows[0]?.count || 0) >= 5) {
      return genericResponse;
    }

    // Invalidate prior unused verification tokens and generate new one
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await tokenRepository.createVerificationToken(user.id, tokenHash, expiresAt);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const verificationUrl = `${clientUrl.replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

    try {
      await emailService.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl,
      });
    } catch (emailErr) {
      console.error("Failed to dispatch verification email in resendVerificationEmail:", emailErr.message || emailErr);
      const error = new Error(`Unable to send verification email: ${emailErr.message || "Please try again in a few moments."}`);
      error.statusCode = 503;
      throw error;
    }

    return genericResponse;
  }

  /**
   * Change a mistyped unverified email address
   * Requires account password, validates that account is currently unverified,
   * updates the email, invalidates all prior tokens, and dispatches a fresh verification email.
   */
  async changeUnverifiedEmail({ currentEmail, password, newEmail }, request = null) {
    if (!currentEmail || typeof currentEmail !== "string" || !currentEmail.trim()) {
      const error = new Error("Current email address is required.");
      error.statusCode = 400;
      error.field = "currentEmail";
      throw error;
    }

    if (!password || typeof password !== "string") {
      const error = new Error("Account password is required.");
      error.statusCode = 400;
      error.field = "password";
      throw error;
    }

    if (!newEmail || typeof newEmail !== "string" || !newEmail.trim()) {
      const error = new Error("New email address is required.");
      error.statusCode = 400;
      error.field = "newEmail";
      throw error;
    }

    const normCurrent = currentEmail.trim().toLowerCase();
    const normNew = newEmail.trim().toLowerCase();

    if (/^www\./i.test(normNew)) {
      const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      error.statusCode = 400;
      error.field = "newEmail";
      throw error;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normNew)) {
      const error = new Error("Please enter a valid new email address.");
      error.statusCode = 400;
      error.field = "newEmail";
      throw error;
    }

    if (normCurrent === normNew) {
      const error = new Error("The new email address cannot be the same as your current email address.");
      error.statusCode = 400;
      error.field = "newEmail";
      throw error;
    }

    // Look up user by current email
    const user = await userRepository.findByEmail(normCurrent);
    if (!user) {
      await bcrypt.hash("dummy_constant_for_timing_normalization", 10);
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      throw error;
    }

    // Verify account password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      throw error;
    }

    // Only allowed while email_verified_at is null
    if (user.email_verified_at) {
      const error = new Error("This email address is already verified. You cannot change email from this screen.");
      error.statusCode = 400;
      throw error;
    }

    // Check if newEmail is already taken by another user
    const existingTargetUser = await userRepository.findByEmail(normNew);
    if (existingTargetUser) {
      // If target user is verified, do not reassign; return anti-enumeration generic response
      if (existingTargetUser.email_verified_at) {
        emailService.sendAccountExistsEmail({ to: normNew, name: existingTargetUser.name }).catch(() => {});
        return {
          success: true,
          message: "If the new email address is eligible, a verification link has been sent.",
          newEmail: normNew,
        };
      }

      // If unverified and older than 72 hours, purge the stale abandoned account
      const isStale =
        existingTargetUser.created_at &&
        Date.now() - new Date(existingTargetUser.created_at).getTime() > 72 * 60 * 60 * 1000;

      if (isStale) {
        await userRepository.deleteUnverifiedUser(existingTargetUser.id);
      } else {
        // Active unverified target user (< 72h): return anti-enumeration generic response
        return {
          success: true,
          message: "If the new email address is eligible, a verification link has been sent.",
          newEmail: normNew,
        };
      }
    }

    // Atomic update of user email, token invalidation, and new token creation
    const client = await getClient();
    let rawToken = "";
    try {
      await client.query("BEGIN");

      // 1. Invalidate all prior unused verification tokens for this user
      await client.query(
        "UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );

      // 2. Update user's email address
      await client.query(
        "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2",
        [normNew, user.id]
      );

      // 3. Generate a fresh 32-byte crypto verification token
      rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await client.query(
        "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [user.id, tokenHash, expiresAt]
      );

      // 4. Record audit log entry
      await auditService.record({
        actor: { id: user.id, role: user.role },
        action: "CUSTOMER_PROFILE_UPDATED",
        entityType: "USER",
        entityId: user.id,
        metadata: { reason: "mistyped_email_correction" },
      }, { client, request });

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Send verification email to the new address
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const verificationUrl = `${clientUrl.replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

    await emailService.sendVerificationEmail({
      to: normNew,
      name: user.name,
      verificationUrl,
    });

    return {
      success: true,
      message: `Your email address has been updated to ${normNew}! A new verification link has been sent to your inbox.`,
      newEmail: normNew,
    };
  }

  async requestPasswordSetup(email) {
    const genericResponse = {
      success: true,
      message: "If the account is eligible, a password setup link has been sent to its verified email.",
    };
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (/^www\./i.test(normalizedEmail)) {
      const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      error.statusCode = 400;
      error.field = "email";
      throw error;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const client = await getClient();
    let user = null;
    try {
      await client.query("BEGIN");
      const lookup = await client.query(
        `SELECT id, name, email
         FROM users
         WHERE LOWER(email) = $1 AND password_hash IS NULL
           AND email_verified_at IS NOT NULL AND status = 'ACTIVE' AND role = 'CUSTOMER'
         LIMIT 1 FOR UPDATE`,
        [normalizedEmail]
      );
      user = lookup.rows[0] || null;
      if (!user) {
        await client.query("COMMIT");
        return genericResponse;
      }

      const recentRequests = await client.query(
        `SELECT COUNT(*)::int AS count FROM password_setup_tokens
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [user.id]
      );
      if ((recentRequests.rows[0]?.count || 0) >= 3) {
        await client.query("COMMIT");
        return genericResponse;
      }
      await client.query(
        "UPDATE password_setup_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );
      await client.query(
        `INSERT INTO password_setup_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [user.id, tokenHash]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const setupUrl = `${clientUrl.replace(/\/$/, "")}/auth/password-setup?token=${encodeURIComponent(rawToken)}`;
    try {
      await emailService.sendPasswordSetupEmail({ to: user.email, name: user.name, setupUrl });
    } catch (error) {
      console.error("Password setup email could not be sent.", error.message || "Email service unavailable.");
      await query("UPDATE password_setup_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL", [tokenHash]);
    }
    return genericResponse;
  }

  async completePasswordSetup({ token, newPassword, confirmPassword }, request = null) {
    if (typeof token !== "string" || token.length < 40 || token.length > 128) {
      const error = new Error("This password setup link is invalid or expired. Request a new link.");
      error.statusCode = 400;
      error.code = "PASSWORD_SETUP_INVALID";
      throw error;
    }
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
      const error = new Error("Password must be between 8 and 72 characters.");
      error.statusCode = 400;
      error.field = "newPassword";
      throw error;
    }
    if (newPassword !== confirmPassword) {
      const error = new Error("Passwords do not match.");
      error.statusCode = 400;
      error.field = "confirmPassword";
      throw error;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const tokenResult = await client.query(
        `SELECT id, user_id FROM password_setup_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );
      const setupToken = tokenResult.rows[0];
      if (!setupToken) {
        const error = new Error("This password setup link is invalid or expired. Request a new link.");
        error.statusCode = 400;
        error.code = "PASSWORD_SETUP_INVALID";
        throw error;
      }

      const userResult = await client.query(
        `SELECT id, role, status, password_hash, email_verified_at
         FROM users WHERE id = $1 FOR UPDATE`,
        [setupToken.user_id]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE" || user.password_hash || !user.email_verified_at) {
        const error = new Error("This password setup link is invalid or expired. Request a new link.");
        error.statusCode = 400;
        error.code = "PASSWORD_SETUP_INVALID";
        throw error;
      }

      await client.query(
        "UPDATE users SET password_hash = $1, refresh_token = NULL, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW() WHERE id = $2",
        [passwordHash, user.id]
      );
      await client.query("UPDATE password_setup_tokens SET used_at = NOW() WHERE id = $1", [setupToken.id]);
      await client.query(
        "UPDATE password_setup_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );
      await auditService.record({
        actor: { id: user.id, role: user.role },
        action: "PASSWORD_CHANGED",
        entityType: "USER",
        entityId: user.id,
        newValues: { changed: true },
        metadata: { method: "PASSWORD_SETUP" },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { success: true, requiresLogin: true };
  }

  /**
   * Request a password reset link for an existing customer.
   * Handles both normal users and provider-only users (who set their first password).
   * Unverified accounts are sent a verification email instead of a password reset link.
   * Always returns a generic response to prevent user enumeration.
   */
  async requestPasswordReset(email) {
    const genericResponse = {
      success: true,
      message: "If an account exists for this email, we've sent a reset link.",
    };
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (/^www\./i.test(normalizedEmail)) {
      const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      error.statusCode = 400;
      error.field = "email";
      throw error;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      // Small dummy work to equalize timing
      await bcrypt.hash("dummy_constant_for_timing_normalization", 4);
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const client = await getClient();
    let user = null;
    try {
      await client.query("BEGIN");
      const lookup = await client.query(
        `SELECT id, name, email, email_verified_at, password_hash, authprovider, status, role
         FROM users
         WHERE LOWER(email) = $1 AND status = 'ACTIVE' AND role = 'CUSTOMER'
         LIMIT 1 FOR UPDATE`,
        [normalizedEmail]
      );
      user = lookup.rows[0] || null;

      if (!user) {
        await client.query("COMMIT");
        // Timing equalization: simulate password hash overhead
        await bcrypt.hash("dummy_constant_for_timing_normalization", 4);
        return genericResponse;
      }

      // If user never verified their email, do NOT issue a password reset link.
      // Instead, trigger a fresh verification email so resetting never bypasses verification.
      if (!user.email_verified_at) {
        await client.query("COMMIT");
        try {
          await this.resendVerificationEmail(user.email);
        } catch (resendErr) {
          console.warn("Could not send verification email for unverified reset requester:", resendErr.message);
        }
        return genericResponse;
      }

      // Rate limit per user: max 5 requests per hour
      const recentRequests = await client.query(
        `SELECT COUNT(*)::int AS count FROM password_reset_tokens
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [user.id]
      );
      if ((recentRequests.rows[0]?.count || 0) >= 5) {
        await client.query("COMMIT");
        return genericResponse;
      }

      // Invalidate any prior unused reset tokens for this user
      await client.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );

      // Token expires in 30 minutes
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [user.id, tokenHash]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientUrl.replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (error) {
      console.error("Password reset email could not be sent.", error.message || "Email service unavailable.");
      await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL", [tokenHash]);
    }
    return genericResponse;
  }

  /**
   * Pre-validate password reset token
   */
  async validatePasswordResetToken(token) {
    if (typeof token !== "string" || token.length < 40 || token.length > 128) {
      return { valid: false, message: "This link is invalid or has expired. Please request a new one." };
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenRecord = await tokenRepository.findPasswordResetToken(tokenHash);
    if (!tokenRecord || tokenRecord.used_at || new Date() > new Date(tokenRecord.expires_at)) {
      return { valid: false, message: "This link is invalid or has expired. Please request a new one." };
    }
    return { valid: true };
  }

  /**
   * Complete password reset using token and set a new password.
   * Invalidates all user sessions and sends a password changed confirmation email.
   */
  async completePasswordReset({ token, newPassword, confirmPassword }, request = null) {
    if (typeof token !== "string" || token.length < 40 || token.length > 128) {
      const error = new Error("This link is invalid or has expired. Please request a new one.");
      error.statusCode = 400;
      error.code = "PASSWORD_RESET_INVALID";
      throw error;
    }
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
      const error = new Error("Password must be between 8 and 72 characters.");
      error.statusCode = 400;
      error.field = "newPassword";
      throw error;
    }

    const commonWeakPasswords = ["password", "password123", "12345678", "123456789", "qwertyuiop", "admin123"];
    if (commonWeakPasswords.includes(newPassword.toLowerCase())) {
      const error = new Error("Password is too common or weak. Please choose a stronger password.");
      error.statusCode = 400;
      error.field = "newPassword";
      throw error;
    }

    if (newPassword !== confirmPassword) {
      const error = new Error("Passwords do not match.");
      error.statusCode = 400;
      error.field = "confirmPassword";
      throw error;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const client = await getClient();
    let updatedUser = null;
    try {
      await client.query("BEGIN");
      const tokenResult = await client.query(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash]
      );
      const resetToken = tokenResult.rows[0];
      if (!resetToken) {
        const error = new Error("This link is invalid or has expired. Please request a new one.");
        error.statusCode = 400;
        error.code = "PASSWORD_RESET_INVALID";
        throw error;
      }

      const userResult = await client.query(
        `SELECT id, name, email, role, status, email_verified_at, password_hash
         FROM users WHERE id = $1 FOR UPDATE`,
        [resetToken.user_id]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE" || !user.email_verified_at) {
        const error = new Error("This link is invalid or has expired. Please request a new one.");
        error.statusCode = 400;
        error.code = "PASSWORD_RESET_INVALID";
        throw error;
      }

      // Reject reuse of current password
      if (user.password_hash) {
        const isCurrent = await bcrypt.compare(newPassword, user.password_hash);
        if (isCurrent) {
          const error = new Error("New password cannot be the same as your current password.");
          error.statusCode = 400;
          error.field = "newPassword";
          throw error;
        }
      }

      // Invalidate all active sessions, refresh tokens, and save new password hash
      await client.query(
        `UPDATE users
         SET password_hash = $1, refresh_token = NULL, previous_refresh_token = NULL,
             refresh_token_rotated_at = NULL, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, user.id]
      );

      // Mark token used and clean up other unused reset tokens for this user
      await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [resetToken.id]);
      await client.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );

      await auditService.record({
        actor: { id: user.id, role: user.role },
        action: "PASSWORD_CHANGED",
        entityType: "USER",
        entityId: user.id,
        newValues: { changed: true },
        metadata: { method: "PASSWORD_RESET" },
      }, { client, request });

      await client.query("COMMIT");
      updatedUser = user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Send security alert notification (email + in-app)
    if (updatedUser?.id) {
      notificationService
        .notify("security.password_changed", {
          userId: updatedUser.id,
          data: { name: updatedUser.name, email: updatedUser.email },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: "Your password has been changed successfully. Please log in with your new password.",
    };
  }

  /**
   * Delete stale unverified accounts older than specified hours (default 72)
   */
  async purgeStaleUnverifiedAccounts(olderThanHours = 72) {
    const deleted = await userRepository.deleteStaleUnverifiedUsers(olderThanHours);
    if (deleted.length > 0) {
      console.log(`[AuthMaintenance] Purged ${deleted.length} stale unverified account(s) older than ${olderThanHours} hours.`);
    }
    return { purgedCount: deleted.length };
  }

  /**
   * Log in user with identifier (email or phone) and password
   */
  async loginUser({ identifier, password, rememberMe = false }, request = null) {
    if (!identifier || !identifier.trim()) {
      const error = new Error("Email or phone number is required.");
      error.statusCode = 400;
      error.field = "identifier";
      throw error;
    }

    if (!password) {
      const error = new Error("Password is required.");
      error.statusCode = 400;
      error.field = "password";
      throw error;
    }

    const cleanIdentifier = identifier.trim();
    if (/^www\./i.test(cleanIdentifier)) {
      const error = new Error("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      error.statusCode = 400;
      error.field = "identifier";
      throw error;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);

    let user = null;
    if (isEmail) {
      user = await userRepository.findByEmail(cleanIdentifier);
    } else {
      user = await userRepository.findByPhone(cleanIdentifier);
    }

    if (!user) {
      const error = new Error("Invalid email/phone or password.");
      error.statusCode = 401;
      throw error;
    }

    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      const error = new Error("Your account has been suspended or blocked. Please contact support.");
      error.statusCode = 403;
      error.code = "ACCOUNT_BLOCKED";
      throw error;
    }

    if (!user.password_hash) {
      const error = new Error("This account has no password set. Please use forgot password to set your password.");
      error.statusCode = 409;
      error.code = "PASSWORD_NOT_SET";
      throw error;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error("Invalid email/phone or password.");
      error.statusCode = 401;
      throw error;
    }

    // Check email verification if user registered with email
    if (user.email && !user.email_verified_at) {
      const error = new Error(
        "Please verify your email address before signing in. Check your inbox for the verification link."
      );
      error.statusCode = 403;
      error.code = "EMAIL_NOT_VERIFIED";
      error.email = user.email;
      throw error;
    }

    // Generate tokens
    const authTime = Math.floor(Date.now() / 1000);
    const accessToken = generateAccessToken(user, authTime);
    const refreshToken = generateRefreshToken(user, rememberMe, authTime);

    // Save refresh token in database
    const client = await getClient();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET refresh_token = $1, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW() WHERE id = $2", [refreshToken, user.id]);
      await auditService.record({
        actor: { id: user.id, role: user.role },
        action: "LOGIN_SUCCEEDED",
        entityType: "USER",
        entityId: user.id,
        newValues: { role: user.role },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role, // 'CUSTOMER' or 'ADMIN'
        profilePicture: user.profile_picture_link,
        emailVerified: Boolean(user.email_verified_at),
        authProvider: user.authprovider,
        hasPassword: Boolean(user.password_hash),
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh Access Token using valid Refresh Token
   */
  async refreshAccessToken(token) {
    if (!token) {
      const error = new Error("Refresh token is required.");
      error.statusCode = 401;
      throw error;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      const error = new Error("Invalid or expired refresh token. Please sign in again.");
      error.statusCode = 401;
      throw error;
    }

    // Verify refresh token matches stored database record
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      const error = new Error("User no longer exists.");
      error.statusCode = 401;
      throw error;
    }

    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      const error = new Error("Your account has been suspended or blocked. Please contact support.");
      error.statusCode = 403;
      error.code = "ACCOUNT_BLOCKED";
      throw error;
    }

    const rememberMe = decoded.rememberMe === true || (Number(decoded.exp) - Number(decoded.iat)) > 10 * 24 * 60 * 60;
    const authTime = Number(decoded.auth_time) || Number(decoded.iat) || Math.floor(Date.now() / 1000);
    let activeRefreshToken;
    if (user.refresh_token === token) {
      const newRefreshToken = generateRefreshToken(user, rememberMe, authTime);
      const rotated = await query(
        `UPDATE users
         SET previous_refresh_token = refresh_token, refresh_token = $1,
             refresh_token_rotated_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND refresh_token = $3
         RETURNING refresh_token`,
        [newRefreshToken, user.id, token]
      );
      activeRefreshToken = rotated.rows[0]?.refresh_token || null;
      if (!activeRefreshToken) {
        const latest = await query(
          "SELECT refresh_token, previous_refresh_token, refresh_token_rotated_at FROM users WHERE id = $1",
          [user.id]
        );
        const state = latest.rows[0];
        if (
          state?.previous_refresh_token === token && state.refresh_token && state.refresh_token_rotated_at &&
          Date.now() - new Date(state.refresh_token_rotated_at).getTime() <= 30000
        ) activeRefreshToken = state.refresh_token;
      }
    } else if (
      user.previous_refresh_token === token && user.refresh_token && user.refresh_token_rotated_at &&
      Date.now() - new Date(user.refresh_token_rotated_at).getTime() <= 30000
    ) {
      // Brief grace window lets concurrent API calls finish after the first request rotates the token.
      activeRefreshToken = user.refresh_token;
    }
    if (!activeRefreshToken) {
      const error = new Error("Refresh token was already used or revoked. Please sign in again.");
      error.statusCode = 401;
      error.code = "REFRESH_TOKEN_REVOKED";
      throw error;
    }

    const newAccessToken = generateAccessToken(user, authTime);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profile_picture_link,
        emailVerified: Boolean(user.email_verified_at),
        authProvider: user.authprovider,
        hasPassword: Boolean(user.password_hash),
      },
      accessToken: newAccessToken,
      refreshToken: activeRefreshToken,
      rememberMe,
    };
  }

  /**
   * Log out user and clear refresh token
   */
  async logoutUser(userId, actor = null, request = null) {
    if (userId) {
      const client = await getClient();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE users SET refresh_token = NULL, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW() WHERE id = $1", [userId]);
        await auditService.record({
          actor: actor || { id: userId, role: "CUSTOMER" },
          action: "LOGOUT",
          entityType: "USER",
          entityId: userId,
        }, { client, request });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    return { success: true, message: "Logged out successfully." };
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profile_picture_link,
      emailVerified: Boolean(user.email_verified_at),
      authProvider: user.authprovider,
      hasPassword: Boolean(user.password_hash),
      createdAt: user.created_at,
    };
  }
}

module.exports = new AuthService();

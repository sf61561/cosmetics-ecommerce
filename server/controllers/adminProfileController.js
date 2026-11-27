const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query, getClient } = require("../config/db");
const emailService = require("../services/emailService");
const auditService = require("../services/auditService");

class AdminProfileController {
  /**
   * Request email verification OTP code before password change
   */
  async requestPasswordChangeCode(req, res, next) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
      }

      // Check if user has an email
      const userRecord = await query("SELECT id, name, email FROM users WHERE id = $1", [user.id]);
      if (!userRecord.rows[0]?.email) {
        return res.status(400).json({
          success: false,
          message: "No email address associated with this administrator account.",
        });
      }

      const email = userRecord.rows[0].email;
      const name = userRecord.rows[0].name || "Administrator";

      // Rate limit: Check if code was requested within the last 60 seconds
      const recent = await query(
        `SELECT created_at FROM admin_password_change_requests
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      if (recent.rows[0]) {
        return res.status(429).json({
          success: false,
          message: "A verification code was recently requested. Please wait 60 seconds before requesting again.",
        });
      }

      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const client = await getClient();
      try {
        await client.query("BEGIN");

        // Invalidate previous unexpired requests
        await client.query(
          "UPDATE admin_password_change_requests SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
          [user.id]
        );

        // Store new OTP request
        await client.query(
          `INSERT INTO admin_password_change_requests (user_id, code_hash, expires_at, created_at, attempts)
           VALUES ($1, $2, $3, NOW(), 0)`,
          [user.id, codeHash, expiresAt]
        );

        await auditService.record(
          {
            actor: user,
            action: "PASSWORD_CHANGE_CODE_REQUESTED",
            entityType: "USER",
            entityId: user.id,
            metadata: { email },
          },
          { client, request: req.auditRequest }
        );

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      // Dispatch verification email
      await emailService.sendPasswordVerificationCodeEmail({
        to: email,
        name,
        code,
        expiresMinutes: 15,
      });

      res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${email}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Confirm password change with email OTP and current password verification
   */
  async confirmPasswordChange(req, res, next) {
    try {
      const user = req.user;
      const { code, currentPassword, newPassword } = req.body;

      if (!code || !String(code).trim()) {
        return res.status(400).json({
          success: false,
          message: "Please enter the 6-digit verification code sent to your email.",
        });
      }

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required.",
        });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long.",
        });
      }

      // Find active code request
      const activeRequest = await query(
        `SELECT * FROM admin_password_change_requests
         WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );

      if (!activeRequest.rows[0]) {
        return res.status(400).json({
          success: false,
          message: "Verification code has expired or was not requested. Please request a new code.",
        });
      }

      const reqRecord = activeRequest.rows[0];

      // Check max attempts (5)
      if (reqRecord.attempts >= 5) {
        await query(
          "UPDATE admin_password_change_requests SET used_at = NOW() WHERE id = $1",
          [reqRecord.id]
        );
        return res.status(429).json({
          success: false,
          message: "Too many invalid attempts. Please request a new verification code.",
        });
      }

      // Verify OTP code hash
      const cleanCode = String(code).trim();
      const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
      if (codeHash !== reqRecord.code_hash) {
        await query(
          "UPDATE admin_password_change_requests SET attempts = attempts + 1 WHERE id = $1",
          [reqRecord.id]
        );
        const remaining = 4 - reqRecord.attempts;
        return res.status(400).json({
          success: false,
          message: `Incorrect verification code. ${
            remaining > 0 ? `${remaining} attempt(s) remaining.` : "Please request a new code."
          }`,
        });
      }

      // Verify current password against database
      const userRecord = await query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
      if (!userRecord.rows[0]?.password_hash) {
        return res.status(400).json({
          success: false,
          message: "Account does not have a current password.",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, userRecord.rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password does not match.",
        });
      }

      // Prevent setting same password
      const isSamePassword = await bcrypt.compare(newPassword, userRecord.rows[0].password_hash);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be the same as your current password.",
        });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      const client = await getClient();
      try {
        await client.query("BEGIN");

        // 1. Update user password
        await client.query(
          "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
          [newHash, user.id]
        );

        // 2. Mark verification request as used
        await client.query(
          "UPDATE admin_password_change_requests SET used_at = NOW() WHERE id = $1",
          [reqRecord.id]
        );

        // 3. Clear all active refresh tokens across devices
        await client.query(
          `UPDATE users
           SET refresh_token = NULL, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW()
           WHERE id = $1`,
          [user.id]
        );

        // 4. Audit log
        await auditService.record(
          {
            actor: user,
            action: "PASSWORD_CHANGED",
            entityType: "USER",
            entityId: user.id,
            metadata: { method: "EMAIL_OTP_VERIFIED" },
          },
          { client, request: req.auditRequest }
        );

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      res.status(200).json({
        success: true,
        message: "Password changed successfully! You will need to log in with your new credentials.",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminProfileController();

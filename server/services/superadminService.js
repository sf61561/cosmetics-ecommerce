const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getClient } = require("../config/db");
const superadminRepository = require("../repositories/superadminRepository");
const userRepository = require("../repositories/userRepository");
const auditService = require("./auditService");
const emailService = require("./emailService");

// High-speed in-memory permissions cache with 30s TTL
const permissionsCache = new Map();
const CACHE_TTL_MS = 30 * 1000;

function getCachedPermissions(userId) {
  const cached = permissionsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }
  return null;
}

function setCachedPermissions(userId, permissions) {
  permissionsCache.set(userId, {
    permissions,
    timestamp: Date.now(),
  });
}

function invalidateCachedPermissions(userId) {
  if (userId) {
    permissionsCache.delete(userId);
  } else {
    permissionsCache.clear();
  }
}

class SuperadminService {
  /**
   * Get permissions for an admin (with TTL cache and fallback to DB)
   */
  async getUserPermissions(userId) {
    if (!userId) return [];
    const cached = getCachedPermissions(userId);
    if (cached) return cached;

    const admin = await superadminRepository.findAdminById(userId);
    const perms = (admin?.permissions || []).map((p) => (typeof p === "string" ? p : p.key));
    setCachedPermissions(userId, perms);
    return perms;
  }

  /**
   * List all admins with pagination and filter counts
   */
  async listAdmins(params) {
    return await superadminRepository.listAdmins(params);
  }

  /**
   * Invite an admin by email
   */
  async inviteAdmin({ email, name = null, permissionKeys = [] }, superadminUser, auditRequest = null) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const err = new Error("Please provide a valid email address.");
      err.statusCode = 400;
      throw err;
    }

    // Check if email already belongs to an existing user
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      if (existing.role === "SUPERADMIN" || existing.role === "ADMIN") {
        const err = new Error("An administrator with this email address already exists.");
        err.statusCode = 409;
        throw err;
      }
      if (existing.role === "CUSTOMER" && existing.email_verified_at) {
        const err = new Error(
          "This email is registered to a verified customer account. Please contact support or convert account deliberately."
        );
        err.statusCode = 409;
        throw err;
      }
    }

    const client = await getClient();
    let newAdmin;
    let rawToken;

    try {
      await client.query("BEGIN");

      // 1. Create or upgrade user to INVITED ADMIN
      if (existing) {
        await client.query(
          `UPDATE users 
           SET role = 'ADMIN', status = 'INVITED', name = COALESCE($1, name), invited_by = $2, updated_at = NOW()
           WHERE id = $3`,
          [name ? name.trim() : null, superadminUser.id, existing.id]
        );
        newAdmin = { id: existing.id, email: cleanEmail, name: name || existing.name };
      } else {
        newAdmin = await superadminRepository.createInvitedAdmin(
          { email: cleanEmail, name, invitedBy: superadminUser.id },
          client
        );
      }

      // 2. Set chosen permissions
      await superadminRepository.setAdminPermissions(
        { userId: newAdmin.id, permissionKeys, grantedBy: superadminUser.id },
        client
      );

      // 3. Generate cryptographic 48-hour single-use token
      rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await superadminRepository.invalidatePendingInvites(newAdmin.id, client);
      await superadminRepository.createInviteToken(
        { userId: newAdmin.id, tokenHash, invitedBy: superadminUser.id, expiresAt },
        client
      );

      // 4. Audit Log
      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_INVITE_SENT",
          entityType: "USER",
          entityId: newAdmin.id,
          newValues: { email: cleanEmail, permissions: permissionKeys },
          metadata: { invitedEmail: cleanEmail, permissionCount: permissionKeys.length },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // 5. Dispatch email via Resend
    const clientBaseUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const inviteUrl = `${clientBaseUrl}/auth/admin-setup?token=${rawToken}`;

    await emailService.sendAdminInviteEmail({
      to: cleanEmail,
      name: name || "there",
      inviteUrl,
      expiresHours: 48,
    });

    return {
      success: true,
      message: `Invitation email sent to ${cleanEmail}.`,
      admin: {
        id: newAdmin.id,
        email: cleanEmail,
        name: newAdmin.name,
        role: "ADMIN",
        status: "INVITED",
      },
    };
  }

  /**
   * Resend an invite (regenerates 48h token)
   */
  async resendInvite(adminId, superadminUser, auditRequest = null) {
    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator account not found.");
      err.statusCode = 404;
      throw err;
    }

    if (admin.status !== "INVITED") {
      const err = new Error("This administrator account has already been activated.");
      err.statusCode = 400;
      throw err;
    }

    const client = await getClient();
    let rawToken;

    try {
      await client.query("BEGIN");

      // Invalidate existing tokens
      await superadminRepository.invalidatePendingInvites(admin.id, client);

      // Create new token
      rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await superadminRepository.createInviteToken(
        { userId: admin.id, tokenHash, invitedBy: superadminUser.id, expiresAt },
        client
      );

      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_INVITE_RESENT",
          entityType: "USER",
          entityId: admin.id,
          metadata: { email: admin.email },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const clientBaseUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const inviteUrl = `${clientBaseUrl}/auth/admin-setup?token=${rawToken}`;

    await emailService.sendAdminInviteEmail({
      to: admin.email,
      name: admin.name || "there",
      inviteUrl,
      expiresHours: 48,
    });

    return {
      success: true,
      message: `A fresh invitation link was sent to ${admin.email}.`,
    };
  }

  /**
   * Cancel an unactivated invite
   */
  async cancelInvite(adminId, superadminUser, auditRequest = null) {
    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator account not found.");
      err.statusCode = 404;
      throw err;
    }

    if (admin.status !== "INVITED") {
      const err = new Error("Only pending invitations can be cancelled.");
      err.statusCode = 400;
      throw err;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      await superadminRepository.invalidatePendingInvites(admin.id, client);
      await superadminRepository.cancelInvitedAdmin(admin.id, client);

      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_INVITE_CANCELLED",
          entityType: "USER",
          entityId: admin.id,
          metadata: { email: admin.email },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: `Invitation for ${admin.email} has been cancelled.`,
    };
  }

  /**
   * Update admin permissions (Guarded by Super Admin password confirmation)
   */
  async updateAdminPermissions(adminId, { permissionKeys = [], superadminPassword }, superadminUser, auditRequest = null) {
    if (!superadminPassword) {
      const err = new Error("Super Admin password re-verification is required to update permissions.");
      err.statusCode = 400;
      throw err;
    }

    // Verify Super Admin's password
    const sa = await userRepository.findById(superadminUser.id);
    if (!sa || !sa.password_hash) {
      const err = new Error("Super Admin account not authenticated.");
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(superadminPassword, sa.password_hash);
    if (!isMatch) {
      const err = new Error("Incorrect Super Admin password. Permission changes rejected.");
      err.statusCode = 403;
      throw err;
    }

    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator not found.");
      err.statusCode = 404;
      throw err;
    }

    if (admin.role === "SUPERADMIN" && admin.id !== superadminUser.id) {
      // Super Admin permissions cannot be restricted
      const err = new Error("Super Admin permissions cannot be modified; Super Admins hold all privileges.");
      err.statusCode = 400;
      throw err;
    }

    const previousPerms = (admin.permissions || []).map((p) => p.key);

    const client = await getClient();
    try {
      await client.query("BEGIN");

      await superadminRepository.setAdminPermissions(
        { userId: admin.id, permissionKeys, grantedBy: superadminUser.id },
        client
      );

      // Invalidate memory cache immediately
      invalidateCachedPermissions(admin.id);

      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_PERMISSIONS_UPDATED",
          entityType: "USER",
          entityId: admin.id,
          previousValues: { permissions: previousPerms },
          newValues: { permissions: permissionKeys },
          metadata: { email: admin.email, permissionCount: permissionKeys.length },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: "Permissions updated successfully.",
      permissions: permissionKeys,
    };
  }

  /**
   * Update admin status (ACTIVE <-> DISABLED) with Last Super Admin Safety Rule
   */
  async updateAdminStatus(adminId, status, superadminUser, auditRequest = null) {
    const cleanStatus = String(status || "").toUpperCase();
    if (!["ACTIVE", "DISABLED"].includes(cleanStatus)) {
      const err = new Error("Invalid status. Supported values are ACTIVE or DISABLED.");
      err.statusCode = 400;
      throw err;
    }

    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator not found.");
      err.statusCode = 404;
      throw err;
    }

    // Safety rule: Cannot disable the last active Super Admin
    if (admin.role === "SUPERADMIN" && cleanStatus === "DISABLED") {
      const activeSaCount = await superadminRepository.countActiveSuperAdmins();
      if (activeSaCount <= 1) {
        const err = new Error("Cannot disable the last active Super Admin account.");
        err.statusCode = 400;
        throw err;
      }
    }

    const client = await getClient();
    let updated;
    try {
      await client.query("BEGIN");
      updated = await superadminRepository.updateAdminStatus(admin.id, cleanStatus, client);

      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_STATUS_CHANGED",
          entityType: "USER",
          entityId: admin.id,
          previousValues: { status: admin.status },
          newValues: { status: cleanStatus },
          metadata: { email: admin.email },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: `Administrator account is now ${cleanStatus.toLowerCase()}.`,
      admin: updated,
    };
  }

  /**
   * Force logout an admin across all devices
   */
  async forceLogoutAdmin(adminId, superadminUser, auditRequest = null) {
    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator not found.");
      err.statusCode = 404;
      throw err;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      await superadminRepository.forceLogoutAdmin(admin.id, client);

      await auditService.record(
        {
          actor: superadminUser,
          action: "ADMIN_FORCE_LOGOUT",
          entityType: "USER",
          entityId: admin.id,
          metadata: { email: admin.email },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return {
      success: true,
      message: `Active sessions for ${admin.email} have been terminated.`,
    };
  }

  /**
   * Trigger a 1-hour password reset link sent to admin's email
   */
  async triggerAdminPasswordReset(adminId, superadminUser, auditRequest = null) {
    const admin = await superadminRepository.findAdminById(adminId);
    if (!admin) {
      const err = new Error("Administrator not found.");
      err.statusCode = 404;
      throw err;
    }

    // Invalidate sessions immediately
    await superadminRepository.forceLogoutAdmin(admin.id);

    // Generate 1-hour password reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await auditService.recordBestEffort(
      {
        actor: superadminUser,
        action: "ADMIN_PASSWORD_RESET_TRIGGERED",
        entityType: "USER",
        entityId: admin.id,
        metadata: { email: admin.email },
      },
      { request: auditRequest }
    );

    // Store in password_reset_tokens
    const { query } = require("../config/db");
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [admin.id, tokenHash, expiresAt]
    );

    const clientBaseUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientBaseUrl}/auth/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail({
      to: admin.email,
      name: admin.name || "Administrator",
      resetUrl,
    });

    return {
      success: true,
      message: `A secure password reset link was dispatched to ${admin.email}.`,
    };
  }

  /**
   * Presets Management
   */
  async listPresets() {
    return await superadminRepository.listPresets();
  }

  async createPreset({ name, description, permissionKeys }, superadminUser, auditRequest = null) {
    if (!name || !name.trim()) {
      const err = new Error("Preset name is required.");
      err.statusCode = 400;
      throw err;
    }

    const client = await getClient();
    let preset;
    try {
      await client.query("BEGIN");
      preset = await superadminRepository.createPreset(
        { name, description, permissionKeys, createdBy: superadminUser.id },
        client
      );

      await auditService.record(
        {
          actor: superadminUser,
          action: "PRESET_CREATED",
          entityType: "SYSTEM",
          entityId: preset.id,
          newValues: { name: preset.name, permissionKeys },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        const duplicateErr = new Error("A preset with this name already exists.");
        duplicateErr.statusCode = 409;
        throw duplicateErr;
      }
      throw err;
    } finally {
      client.release();
    }

    return preset;
  }

  async updatePreset(presetId, { name, description, permissionKeys }, superadminUser, auditRequest = null) {
    const client = await getClient();
    let updated;
    try {
      await client.query("BEGIN");
      updated = await superadminRepository.updatePreset(presetId, { name, description, permissionKeys }, client);

      await auditService.record(
        {
          actor: superadminUser,
          action: "PRESET_UPDATED",
          entityType: "SYSTEM",
          entityId: presetId,
          newValues: { name, permissionKeys },
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return updated;
  }

  async deletePreset(presetId, superadminUser, auditRequest = null) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      await superadminRepository.deletePreset(presetId, client);

      await auditService.record(
        {
          actor: superadminUser,
          action: "PRESET_DELETED",
          entityType: "SYSTEM",
          entityId: presetId,
        },
        { client, request: auditRequest }
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { success: true, message: "Preset deleted." };
  }

  /**
   * Master permissions list
   */
  async listAllPermissions() {
    return await superadminRepository.listAllPermissions();
  }

  async getDashboardOverview() {
    return await superadminRepository.getDashboardOverview();
  }
}

module.exports = new SuperadminService();

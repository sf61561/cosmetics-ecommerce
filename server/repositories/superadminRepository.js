const { query } = require("../config/db");

const superadminRepository = {
  /**
   * List all administrative users with their assigned permissions
   */
  async listAdmins({ search = "", status = "all", page = 1, limit = 20 } = {}) {
    const values = [];
    const conditions = ["u.role::text IN ('ADMIN', 'SUPERADMIN')"];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(u.name) LIKE $${values.length} OR LOWER(u.email) LIKE $${values.length})`);
    }

    if (status && status !== "all") {
      values.push(status.toUpperCase());
      conditions.push(`u.status = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = countRes.rows[0]?.total || 0;

    // Data query with permission aggregation
    const offset = Math.max(0, (Number(page) - 1) * Number(limit));
    values.push(Number(limit), offset);

    const dataSql = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.invited_by, 
        u.last_login_at, 
        u.created_at, 
        u.updated_at,
        u_inv.name AS invited_by_name,
        u_inv.email AS invited_by_email,
        ai.expires_at AS invite_expires_at,
        ai.used_at AS invite_used_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'key', p.key, 
              'label', p.label, 
              'group', p.group
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS permissions
      FROM users u
      LEFT JOIN users u_inv ON u_inv.id = u.invited_by
      LEFT JOIN LATERAL (
        SELECT expires_at, used_at 
        FROM admin_invites 
        WHERE user_id = u.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) ai ON true
      LEFT JOIN admin_permissions ap ON ap.user_id = u.id
      LEFT JOIN permissions p ON p.id = ap.permission_id
      ${whereClause}
      GROUP BY u.id, u_inv.name, u_inv.email, ai.expires_at, ai.used_at
      ORDER BY 
        CASE WHEN u.role = 'SUPERADMIN' THEN 1 ELSE 2 END,
        u.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataRes = await query(dataSql, values);

    // Summary counts
    const summaryRes = await query(`
      SELECT 
        COUNT(*)::int AS total_admins,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_admins,
        COUNT(*) FILTER (WHERE status = 'INVITED')::int AS invited_admins,
        COUNT(*) FILTER (WHERE status = 'DISABLED')::int AS disabled_admins
      FROM users
      WHERE role::text IN ('ADMIN', 'SUPERADMIN')
    `);

    return {
      admins: dataRes.rows,
      summary: summaryRes.rows[0] || { total_admins: 0, active_admins: 0, invited_admins: 0, disabled_admins: 0 },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  },

  /**
   * Find an admin by ID along with their granted permissions
   */
  async findAdminById(adminId) {
    const sql = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.invited_by, 
        u.last_login_at, 
        u.created_at, 
        u.updated_at,
        u_inv.name AS invited_by_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'key', p.key, 
              'label', p.label, 
              'group', p.group
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS permissions
      FROM users u
      LEFT JOIN users u_inv ON u_inv.id = u.invited_by
      LEFT JOIN admin_permissions ap ON ap.user_id = u.id
      LEFT JOIN permissions p ON p.id = ap.permission_id
      WHERE u.id = $1 AND u.role::text IN ('ADMIN', 'SUPERADMIN')
      GROUP BY u.id, u_inv.name
      LIMIT 1
    `;
    const res = await query(sql, [adminId]);
    return res.rows[0] || null;
  },

  /**
   * Create an admin in INVITED status
   */
  async createInvitedAdmin({ email, name = null, invitedBy }, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `INSERT INTO users (email, name, role, status, invited_by, created_at, updated_at)
       VALUES ($1, $2, 'ADMIN', 'INVITED', $3, NOW(), NOW())
       RETURNING id, name, email, role, status, created_at`,
      [email.toLowerCase().trim(), name ? name.trim() : null, invitedBy]
    );
    return res.rows[0];
  },

  /**
   * Create a single-use invitation token in admin_invites
   */
  async createInviteToken({ userId, tokenHash, invitedBy, expiresAt }, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `INSERT INTO admin_invites (user_id, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, expires_at, created_at`,
      [userId, tokenHash, invitedBy, expiresAt]
    );
    return res.rows[0];
  },

  /**
   * Find an invitation by SHA-256 token hash
   */
  async findInviteByTokenHash(tokenHash) {
    const sql = `
      SELECT 
        ai.id, 
        ai.user_id, 
        ai.token_hash, 
        ai.expires_at, 
        ai.used_at, 
        ai.created_at,
        u.email, 
        u.name, 
        u.role, 
        u.status
      FROM admin_invites ai
      JOIN users u ON u.id = ai.user_id
      WHERE ai.token_hash = $1
      LIMIT 1
    `;
    const res = await query(sql, [tokenHash]);
    return res.rows[0] || null;
  },

  /**
   * Mark invitation token as used
   */
  async markInviteUsed(inviteId, client = null) {
    const runner = client || { query };
    await runner.query(
      `UPDATE admin_invites SET used_at = NOW() WHERE id = $1`,
      [inviteId]
    );
  },

  /**
   * Invalidate all previous unused invite tokens for an admin
   */
  async invalidatePendingInvites(userId, client = null) {
    const runner = client || { query };
    await runner.query(
      `UPDATE admin_invites SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
  },

  /**
   * Cancel and delete an unactivated admin record
   */
  async cancelInvitedAdmin(userId, client = null) {
    const runner = client || { query };
    await runner.query(
      `DELETE FROM users WHERE id = $1 AND status = 'INVITED'`,
      [userId]
    );
  },

  /**
   * Set permissions for an admin by permission keys
   */
  async setAdminPermissions({ userId, permissionKeys = [], grantedBy = null }, client = null) {
    const runner = client || { query };

    // 1. Clear previous assigned permissions
    await runner.query(`DELETE FROM admin_permissions WHERE user_id = $1`, [userId]);

    if (!permissionKeys || !permissionKeys.length) {
      return [];
    }

    // 2. Resolve permission IDs from keys
    const permsRes = await runner.query(
      `SELECT id, key FROM permissions WHERE key = ANY($1::varchar[])`,
      [permissionKeys]
    );

    const validPerms = permsRes.rows;
    if (!validPerms.length) return [];

    // 3. Insert into admin_permissions
    for (const perm of validPerms) {
      await runner.query(
        `INSERT INTO admin_permissions (user_id, permission_id, granted_by, granted_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, permission_id) DO NOTHING`,
        [userId, perm.id, grantedBy]
      );
    }

    return validPerms.map((p) => p.key);
  },

  /**
   * Count active Super Admins (Safety rule guard)
   */
  async countActiveSuperAdmins(client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `SELECT COUNT(*)::int AS count 
       FROM users 
       WHERE role::text = 'SUPERADMIN' AND status = 'ACTIVE'`
    );
    return res.rows[0]?.count || 0;
  },

  /**
   * Toggle admin status (ACTIVE <-> DISABLED) and wipe refresh token
   */
  async updateAdminStatus(adminId, status, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE users 
       SET status = $1, 
           refresh_token = CASE WHEN $1 = 'DISABLED' THEN NULL ELSE refresh_token END,
           previous_refresh_token = CASE WHEN $1 = 'DISABLED' THEN NULL ELSE previous_refresh_token END,
           refresh_token_rotated_at = CASE WHEN $1 = 'DISABLED' THEN NULL ELSE refresh_token_rotated_at END,
           updated_at = NOW()
       WHERE id = $2 AND role::text IN ('ADMIN', 'SUPERADMIN')
       RETURNING id, name, email, role, status`,
      [status, adminId]
    );
    return res.rows[0] || null;
  },

  /**
   * Force logout an admin by nullifying refresh token
   */
  async forceLogoutAdmin(adminId, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE users 
       SET refresh_token = NULL, 
           previous_refresh_token = NULL, 
           refresh_token_rotated_at = NULL, 
           updated_at = NOW()
       WHERE id = $1 AND role::text IN ('ADMIN', 'SUPERADMIN')
       RETURNING id, name, email`,
      [adminId]
    );
    return res.rows[0] || null;
  },

  /**
   * List master operational permissions list grouped by domain
   */
  async listAllPermissions() {
    const res = await query(
      `SELECT id, key, label, "group", description 
       FROM permissions 
       ORDER BY "group" ASC, key ASC`
    );
    return res.rows;
  },

  /**
   * Dynamic Presets Management
   */
  async listPresets() {
    const sql = `
      SELECT 
        pp.id, 
        pp.name, 
        pp.description, 
        pp.created_by, 
        pp.created_at, 
        pp.updated_at,
        u.name AS created_by_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'key', p.key, 
              'label', p.label, 
              'group', p.group
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS permissions,
        COALESCE(array_agg(p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permission_keys
      FROM permission_presets pp
      LEFT JOIN users u ON u.id = pp.created_by
      LEFT JOIN preset_permissions prp ON prp.preset_id = pp.id
      LEFT JOIN permissions p ON p.id = prp.permission_id
      GROUP BY pp.id, u.name
      ORDER BY pp.name ASC
    `;
    const res = await query(sql);
    return res.rows;
  },

  async createPreset({ name, description = null, permissionKeys = [], createdBy = null }, client = null) {
    const runner = client || { query };
    const presetRes = await runner.query(
      `INSERT INTO permission_presets (name, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, description, created_by, created_at`,
      [name.trim(), description ? description.trim() : null, createdBy]
    );
    const preset = presetRes.rows[0];

    if (permissionKeys && permissionKeys.length) {
      const permsRes = await runner.query(
        `SELECT id FROM permissions WHERE key = ANY($1::varchar[])`,
        [permissionKeys]
      );
      for (const p of permsRes.rows) {
        await runner.query(
          `INSERT INTO preset_permissions (preset_id, permission_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [preset.id, p.id]
        );
      }
    }

    return preset;
  },

  async updatePreset(presetId, { name, description, permissionKeys }, client = null) {
    const runner = client || { query };
    const updates = [];
    const values = [];

    if (name !== undefined) {
      values.push(name.trim());
      updates.push(`name = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description ? description.trim() : null);
      updates.push(`description = $${values.length}`);
    }

    updates.push("updated_at = NOW()");
    values.push(presetId);

    const updateSql = `
      UPDATE permission_presets 
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, name, description, updated_at
    `;
    const res = await runner.query(updateSql, values);
    const updated = res.rows[0];

    if (permissionKeys !== undefined) {
      await runner.query(`DELETE FROM preset_permissions WHERE preset_id = $1`, [presetId]);
      if (permissionKeys && permissionKeys.length) {
        const permsRes = await runner.query(
          `SELECT id FROM permissions WHERE key = ANY($1::varchar[])`,
          [permissionKeys]
        );
        for (const p of permsRes.rows) {
          await runner.query(
            `INSERT INTO preset_permissions (preset_id, permission_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [presetId, p.id]
          );
        }
      }
    }

    return updated;
  },

  async deletePreset(presetId, client = null) {
    const runner = client || { query };
    await runner.query(`DELETE FROM permission_presets WHERE id = $1`, [presetId]);
  },
};

module.exports = superadminRepository;

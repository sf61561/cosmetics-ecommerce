const { query } = require("../config/db");

const providerRepository = {
  async findUserByIdentity(provider, providerUserId, executor = { query }) {
    const result = await executor.query(
      `SELECT u.id, u.name, u.phone, u.email, u.email_verified_at, u.role, u.status,
              u.profile_picture_link, u.authprovider, u.password_hash, u.created_at
       FROM user_providers p
       JOIN users u ON u.id = p.user_id
       WHERE p.provider = $1 AND p.provider_user_id = $2
       LIMIT 1`,
      [provider.toLowerCase(), String(providerUserId)]
    );
    return result.rows[0] || null;
  },

  async listForUser(userId) {
    const result = await query(
      `SELECT provider, created_at AS linked_at
       FROM user_providers WHERE user_id = $1 ORDER BY provider`,
      [userId]
    );
    return result.rows.map((row) => ({ provider: row.provider, linkedAt: row.linked_at }));
  },

  async create(userId, provider, providerUserId, executor) {
    const result = await executor.query(
      `INSERT INTO user_providers (user_id, provider, provider_user_id)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, provider, provider_user_id, created_at`,
      [userId, provider.toLowerCase(), String(providerUserId)]
    );
    return result.rows[0];
  },

  async countForUser(userId, executor = { query }) {
    const result = await executor.query(
      "SELECT COUNT(*)::int AS count FROM user_providers WHERE user_id = $1",
      [userId]
    );
    return result.rows[0]?.count || 0;
  },

  async remove(userId, provider, executor) {
    const result = await executor.query(
      `DELETE FROM user_providers
       WHERE user_id = $1 AND provider = $2
       RETURNING id`,
      [userId, provider.toLowerCase()]
    );
    return result.rows[0] || null;
  },
};

module.exports = providerRepository;

const { query } = require("../config/db");

const userRepository = {
  /**
   * Find a user by phone number
   */
  async findByPhone(phone) {
    const res = await query(
      "SELECT id, name, phone, email, email_verified_at, role, status, profile_picture_link, authprovider, password_hash, created_at FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a user by email (case-insensitive)
   */
  async findByEmail(email) {
    if (!email) return null;
    const res = await query(
      "SELECT id, name, phone, email, email_verified_at, role, status, profile_picture_link, authprovider, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a user by ID
   */
  async findById(id) {
    const res = await query(
      "SELECT id, name, phone, email, email_verified_at, role, status, profile_picture_link, profile_picture_public_id, agreed_to_terms, authprovider, oauth_id, password_hash, refresh_token, previous_refresh_token, refresh_token_rotated_at, created_at FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a user by OAuth provider and OAuth ID
   */
  async findByOAuth(provider, oauthId) {
    if (!provider || !oauthId) return null;
    const res = await query(
      "SELECT id, name, phone, email, email_verified_at, role, profile_picture_link, authprovider, oauth_id, created_at FROM users WHERE authprovider = $1 AND oauth_id = $2 LIMIT 1",
      [provider, oauthId]
    );
    return res.rows[0] || null;
  },

  /**
   * Create a new user directly from OAuth information
   */
  async createOAuthUser({
    name,
    email,
    profilePicture = null,
    provider,
    oauthId,
    emailVerified = true,
  }) {
    const sql = `
      INSERT INTO users (
        name,
        email,
        email_verified_at,
        profile_picture_link,
        authprovider,
        oauth_id,
        role,
        agreed_to_terms
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'CUSTOMER', true)
      RETURNING id, name, phone, email, role, email_verified_at, profile_picture_link, authprovider, oauth_id, created_at;
    `;
    const emailVerifiedAt = emailVerified ? new Date() : null;
    const values = [
      name,
      email ? email.toLowerCase() : null,
      emailVerifiedAt,
      profilePicture,
      provider,
      oauthId,
    ];
    const res = await query(sql, values);
    return res.rows[0];
  },

  /**
   * Link OAuth credentials to an existing user
   */
  async linkOAuthToUser(userId, { provider, oauthId, profilePicture = null }) {
    const sql = `
      UPDATE users
      SET authprovider = $2,
          oauth_id = $3,
          profile_picture_link = COALESCE(profile_picture_link, $4),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, phone, email, role, email_verified_at, profile_picture_link, authprovider, oauth_id, created_at;
    `;
    const res = await query(sql, [userId, provider, oauthId, profilePicture]);
    return res.rows[0];
  },

  /**
   * Create a new user
   */
  async createUser({
    name,
    phone,
    email,
    passwordHash,
    role = "CUSTOMER",
    profilePictureLink = null,
    profilePicturePublicId = null,
    agreedToTerms = true,
    authProvider
  }) {
    const sql = `
      INSERT INTO users (
        name,
        phone,
        email,
        password_hash,
        role,
        profile_picture_link,
        profile_picture_public_id,
        agreed_to_terms,
        authprovider
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, phone, email, role, profile_picture_link, profile_picture_public_id, agreed_to_terms, created_at, authprovider;
    `;

    const values = [
      name,
      phone,
      email || null,
      passwordHash,
      role,
      profilePictureLink,
      profilePicturePublicId,
      agreedToTerms,
      authProvider
    ];

    const res = await query(sql, values);
    return res.rows[0];
  },

  /**
   * Update refresh token for user
   */
  async updateRefreshToken(userId, refreshToken) {
    const sql = `
      UPDATE users
      SET refresh_token = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const res = await query(sql, [userId, refreshToken]);
    return res.rows[0] || null;
  },

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const sql = `
      SELECT id, name, phone, email, email_verified_at, role, status, profile_picture_link, authprovider, created_at
      FROM users
      WHERE refresh_token = $1
      LIMIT 1
    `;
    const res = await query(sql, [refreshToken]);
    return res.rows[0] || null;
  },

  /**
   * Clear refresh token (on logout)
   */
  async clearRefreshToken(userId) {
    const sql = `
      UPDATE users
      SET refresh_token = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const res = await query(sql, [userId]);
    return res.rows[0] || null;
  },

  /**
   * Delete a single unverified user (e.g. to allow fresh registration on stale email reservation)
   */
  async deleteUnverifiedUser(userId, executor = { query }) {
    const sql = `
      DELETE FROM users
      WHERE id = $1
        AND email_verified_at IS NULL
        AND role = 'CUSTOMER'
        AND NOT EXISTS (SELECT 1 FROM orders WHERE user_id = users.id)
        AND NOT EXISTS (SELECT 1 FROM user_providers WHERE user_id = users.id)
      RETURNING id, email;
    `;
    const res = await executor.query(sql, [userId]);
    return res.rows[0] || null;
  },

  /**
   * Delete unverified accounts older than specified hours (default 72h)
   * so abandoned registrations do not permanently block email addresses.
   */
  async deleteStaleUnverifiedUsers(olderThanHours = 72, executor = { query }) {
    const sql = `
      DELETE FROM users
      WHERE email_verified_at IS NULL
        AND created_at < NOW() - ($1 || ' hours')::INTERVAL
        AND role = 'CUSTOMER'
        AND NOT EXISTS (SELECT 1 FROM orders WHERE user_id = users.id)
        AND NOT EXISTS (SELECT 1 FROM user_providers WHERE user_id = users.id)
      RETURNING id, email;
    `;
    const res = await executor.query(sql, [Math.max(1, parseInt(olderThanHours, 10) || 72)]);
    return res.rows;
  },
};

module.exports = userRepository;


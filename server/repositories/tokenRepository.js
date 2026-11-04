const { query } = require("../config/db");

const tokenRepository = {
  /**
   * Save an email verification token
   */
  async createVerificationToken(userId, tokenHash, expiresAt) {
    // Delete any old unused verification tokens for this user
    await query(
      "DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL",
      [userId]
    );

    const sql = `
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, expires_at, created_at;
    `;
    const res = await query(sql, [userId, tokenHash, expiresAt]);
    return res.rows[0];
  },

  /**
   * Find verification token by its hash
   */
  async findVerificationToken(tokenHash) {
    const sql = `
      SELECT id, user_id, token_hash, expires_at, used_at, created_at
      FROM email_verification_tokens
      WHERE token_hash = $1
      LIMIT 1;
    `;
    const res = await query(sql, [tokenHash]);
    return res.rows[0] || null;
  },

  /**
   * Mark token as used
   */
  async markTokenUsed(tokenId, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE id = $1
      RETURNING id, used_at;
    `;
    const res = await executor.query(sql, [tokenId]);
    return res.rows[0];
  },

  /**
   * Mark user's email as verified in users table
   */
  async markEmailVerified(userId, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      UPDATE users
      SET email_verified_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, email_verified_at;
    `;
    const res = await executor.query(sql, [userId]);
    return res.rows[0];
  },

  /**
   * Save a password reset token
   */
  async createPasswordResetToken(userId, tokenHash, expiresAt, dbClient = null) {
    const executor = dbClient || { query };
    // Delete any old unused reset tokens for this user
    await executor.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL",
      [userId]
    );

    const sql = `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, expires_at, created_at;
    `;
    const res = await executor.query(sql, [userId, tokenHash, expiresAt]);
    return res.rows[0];
  },

  /**
   * Find a valid, unused password reset token by hash
   */
  async findPasswordResetToken(tokenHash, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      SELECT id, user_id, token_hash, expires_at, used_at, created_at
      FROM password_reset_tokens
      WHERE token_hash = $1
      LIMIT 1;
    `;
    const res = await executor.query(sql, [tokenHash]);
    return res.rows[0] || null;
  },

  /**
   * Mark password reset token as used
   */
  async markPasswordResetTokenUsed(tokenId, dbClient = null) {
    const executor = dbClient || { query };
    const sql = `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1
      RETURNING id, used_at;
    `;
    const res = await executor.query(sql, [tokenId]);
    return res.rows[0];
  },
};

module.exports = tokenRepository;


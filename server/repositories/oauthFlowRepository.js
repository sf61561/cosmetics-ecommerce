const { query } = require("../config/db");

const oauthFlowRepository = {
  async create({ provider, flowType, userId = null, stateHash, codeVerifier = null, returnTo = "/" }) {
    await query("DELETE FROM oauth_flows WHERE expires_at < NOW() OR used_at < NOW() - INTERVAL '1 day'");
    const result = await query(
      `INSERT INTO oauth_flows (provider, flow_type, user_id, state_hash, code_verifier, return_to, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '10 minutes')
       RETURNING id, provider, flow_type, user_id, code_verifier, return_to, expires_at`,
      [provider.toLowerCase(), flowType, userId, stateHash, codeVerifier, returnTo]
    );
    return result.rows[0];
  },

  async consume(provider, stateHash) {
    const result = await query(
      `UPDATE oauth_flows
       SET used_at = NOW()
       WHERE provider = $1 AND state_hash = $2 AND used_at IS NULL AND expires_at > NOW()
       RETURNING id, provider, flow_type, user_id, code_verifier, return_to, expires_at`,
      [provider.toLowerCase(), stateHash]
    );
    return result.rows[0] || null;
  },
};

module.exports = oauthFlowRepository;

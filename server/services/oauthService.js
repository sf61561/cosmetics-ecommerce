const crypto = require("crypto");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwtHelper");
const oauthRegistry = require("./oauth/oauthRegistry");
const providerRepository = require("../repositories/providerRepository");
const oauthFlowRepository = require("../repositories/oauthFlowRepository");
const { getClient, query } = require("../config/db");
const auditService = require("./auditService");
require("dotenv").config();

function serviceError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role || "CUSTOMER",
    profilePicture: user.profile_picture_link || null,
    emailVerified: Boolean(user.email_verified_at),
    authProvider: user.authprovider || "local",
    hasPassword: Boolean(user.password_hash),
  };
}

class OAuthService {
  getAuthorizationUrl(providerName, state = "", options = {}) {
    const provider = oauthRegistry.get(providerName);
    if (!provider) throw serviceError("OAuth provider is not supported.", "OAUTH_PROVIDER_UNSUPPORTED", 400);
    if (!provider.isConfigured()) throw serviceError("OAuth provider is not configured.", "OAUTH_PROVIDER_UNAVAILABLE", 503);
    return provider.getAuthorizationUrl(state, options);
  }

  async startFlow({ providerName, flowType = "LOGIN", userId = null, returnTo = "/" }) {
    const providerNameNormalized = String(providerName || "").toLowerCase();
    const provider = oauthRegistry.get(providerNameNormalized);
    if (!provider) throw serviceError("OAuth provider is not supported.", "OAUTH_PROVIDER_UNSUPPORTED", 400);
    if (!provider.isConfigured()) throw serviceError("OAuth provider is not configured.", "OAUTH_PROVIDER_UNAVAILABLE", 503);

    const state = crypto.randomBytes(32).toString("base64url");
    const codeVerifier = providerNameNormalized === "google" ? crypto.randomBytes(32).toString("base64url") : null;
    const codeChallenge = codeVerifier
      ? crypto.createHash("sha256").update(codeVerifier).digest("base64url")
      : null;
    await oauthFlowRepository.create({
      provider: providerNameNormalized,
      flowType,
      userId,
      stateHash: crypto.createHash("sha256").update(state).digest("hex"),
      codeVerifier,
      returnTo,
    });

    return {
      state,
      authorizationUrl: provider.getAuthorizationUrl(state, { codeChallenge }),
    };
  }

  async consumeFlow(providerName, state) {
    if (typeof state !== "string" || state.length < 32 || state.length > 200) {
      throw serviceError("OAuth state is missing or invalid. Start sign-in again.", "OAUTH_STATE_INVALID", 400);
    }
    const stateHash = crypto.createHash("sha256").update(state).digest("hex");
    const flow = await oauthFlowRepository.consume(providerName, stateHash);
    if (!flow) throw serviceError("OAuth state expired or was already used. Start sign-in again.", "OAUTH_STATE_INVALID", 400);
    return flow;
  }

  async handleCallback(providerName, code, flow, request = null) {
    const providerNameNormalized = String(providerName || "").toLowerCase();
    const provider = oauthRegistry.get(providerNameNormalized);
    if (!provider) throw serviceError("OAuth provider is not supported.", "OAUTH_PROVIDER_UNSUPPORTED", 400);
    if (!code || typeof code !== "string" || code.length > 4096) {
      throw serviceError("OAuth authorization code is missing or invalid.", "OAUTH_CODE_INVALID", 400);
    }

    const profile = await provider.getUserProfile(code, { codeVerifier: flow.code_verifier });
    if (!profile || !profile.providerUserId || String(profile.providerUserId).length > 255) {
      throw serviceError("The provider did not return a valid account identity.", "OAUTH_PROFILE_INVALID", 400);
    }
    profile.provider = providerNameNormalized;
    profile.email = normalizeEmail(profile.email);
    const providedName = String(profile.name || "").trim().slice(0, 100);
    profile.name = providedName || profile.email?.split("@")[0] || "RupKotha Customer";

    if (flow.flow_type === "LINK") {
      return this.linkIdentity({ flow, profile, request });
    }
    return this.loginIdentity({ flow, profile, request });
  }

  async linkIdentity({ flow, profile, request }) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `SELECT id, name, email, phone, email_verified_at, role, status, profile_picture_link,
                authprovider, password_hash
         FROM users WHERE id = $1 FOR UPDATE`,
        [flow.user_id]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "CUSTOMER") throw serviceError("Account is not available for provider linking.", "ACCOUNT_UNAVAILABLE", 404);
      if (user.status !== "ACTIVE") throw serviceError("This account cannot link a provider while it is inactive.", "ACCOUNT_BLOCKED", 403);

      const linkedUser = await providerRepository.findUserByIdentity(profile.provider, profile.providerUserId, client);
      if (linkedUser && linkedUser.id !== user.id) {
        throw serviceError("This provider account is already linked to another RupKotha account.", "PROVIDER_ALREADY_LINKED", 409);
      }

      if (!linkedUser) {
        await providerRepository.create(user.id, profile.provider, profile.providerUserId, client);
        const updatedUser = await client.query(
          `UPDATE users
           SET authprovider = CASE WHEN LOWER(COALESCE(authprovider, 'local')) = 'local' THEN $1 ELSE authprovider END,
               oauth_id = CASE WHEN LOWER(COALESCE(authprovider, 'local')) = 'local' THEN $2 ELSE oauth_id END,
               profile_picture_link = COALESCE(profile_picture_link, $3),
               email_verified_at = CASE
                 WHEN email_verified_at IS NULL AND LOWER(email) = $4 AND $5 THEN NOW()
                 ELSE email_verified_at
               END,
               updated_at = NOW()
           WHERE id = $6
           RETURNING id, name, email, phone, email_verified_at, role, status,
                     profile_picture_link, authprovider, password_hash`,
          [profile.provider, profile.providerUserId, profile.profilePicture || null, profile.email, Boolean(profile.emailVerified), user.id]
        );
        Object.assign(user, updatedUser.rows[0]);
        await auditService.record({
          actor: { id: user.id, role: user.role },
          action: "ACCOUNT_PROVIDER_LINKED",
          entityType: "USER",
          entityId: user.id,
          newValues: { provider: profile.provider },
        }, { client, request });
      }

      await client.query("COMMIT");
      return { flowType: "LINK", user: safeUser(user), provider: profile.provider, returnTo: flow.return_to };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") throw serviceError("This provider account is already linked to a RupKotha account.", "PROVIDER_ALREADY_LINKED", 409);
      throw error;
    } finally {
      client.release();
    }
  }

  async loginIdentity({ flow, profile, request }) {
    let user;
    let created = false;
    let client = await getClient();
    try {
      await client.query("BEGIN");
      user = await providerRepository.findUserByIdentity(profile.provider, profile.providerUserId, client);

      if (!user) {
        if (profile.email) {
          const existing = await client.query(
            `SELECT id, email_verified_at, password_hash, role, status,
                    name, phone, profile_picture_link, authprovider
             FROM users WHERE LOWER(email) = $1 LIMIT 1 FOR UPDATE`,
            [profile.email]
          );

          if (existing.rows[0]) {
            const existingUser = existing.rows[0];

            // Provider email is unverified — never link automatically
            if (!profile.emailVerified) {
              throw serviceError(
                "This email already has a RupKotha account. Sign in to it, then link this provider in Security settings.",
                "ACCOUNT_LINK_REQUIRED",
                409
              );
            }

            // Provider email is verified but the local account is not yet verified.
            // The provider proved ownership of the email, so we:
            //   1. Mark the email as verified (clearing the unverified state)
            //   2. Clear the unverified password hash so the attacker's pre-registered
            //      password can never be used
            //   3. Link the provider identity and log the user in
            if (!existingUser.email_verified_at) {
              if (existingUser.role !== "CUSTOMER" || existingUser.status !== "ACTIVE") {
                throw serviceError(
                  "This account is not available. Contact support if you need help.",
                  "ACCOUNT_BLOCKED",
                  403
                );
              }

              const upgraded = await client.query(
                `UPDATE users
                 SET email_verified_at = NOW(),
                     password_hash = NULL,
                     updated_at = NOW()
                 WHERE id = $1
                 RETURNING id, name, phone, email, email_verified_at, role, status,
                           profile_picture_link, authprovider, password_hash`,
                [existingUser.id]
              );
              user = upgraded.rows[0];

              await providerRepository.create(user.id, profile.provider, profile.providerUserId, client);
              created = false;

              await auditService.record({
                actor: { id: user.id, role: user.role },
                action: "EMAIL_VERIFIED",
                entityType: "USER",
                entityId: user.id,
                previousValues: { verified: false },
                newValues: { verified: true },
                metadata: {
                  verificationMethod: "oauth_provider_auto_link",
                  provider: profile.provider,
                  note: "Password hash cleared; provider proved email ownership",
                },
              }, { client, request });
            } else {
              // Both the existing account and the provider email are verified —
              // the user should link from Settings (we can't silently merge two
              // fully established accounts without user consent).
              throw serviceError(
                "This email already has a RupKotha account. Sign in to it, then link this provider in Security settings.",
                "ACCOUNT_LINK_REQUIRED",
                409
              );
            }
          }
        }

        // Only insert a brand-new user if the email-collision path above
        // did not already resolve `user` via auto-link.
        if (!user) {
          const inserted = await client.query(
          `INSERT INTO users
             (name, email, email_verified_at, profile_picture_link, authprovider, oauth_id,
              role, agreed_to_terms, password_hash)
           VALUES ($1, $2, CASE WHEN $3 THEN NOW() ELSE NULL END, $4, $5, $6, 'CUSTOMER', true, NULL)
           RETURNING id, name, phone, email, email_verified_at, role, status, profile_picture_link,
                     authprovider, password_hash, created_at`,
          [profile.name, profile.email, Boolean(profile.emailVerified && profile.email), profile.profilePicture || null, profile.provider, profile.providerUserId]
        );
        user = inserted.rows[0];
        await providerRepository.create(user.id, profile.provider, profile.providerUserId, client);
        created = true;
        }
      } else if (
        !user.email_verified_at && profile.emailVerified && profile.email &&
        user.email && user.email.toLowerCase() === profile.email
      ) {
        const verified = await client.query(
          "UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING email_verified_at",
          [user.id]
        );
        user.email_verified_at = verified.rows[0]?.email_verified_at || null;
        await auditService.record({
          actor: { id: user.id, role: user.role },
          action: "EMAIL_VERIFIED",
          entityType: "USER",
          entityId: user.id,
          previousValues: { verified: false },
          newValues: { verified: true },
          metadata: { verificationMethod: "oauth_provider", provider: profile.provider },
        }, { client, request });
      }

      if (!user || user.status !== "ACTIVE") {
        throw serviceError("This account is not available. Contact support if you need help.", "ACCOUNT_BLOCKED", 403);
      }

      const authTime = Math.floor(Date.now() / 1000);
      const accessToken = generateAccessToken(user, authTime);
      const refreshToken = generateRefreshToken(user, true, authTime);
      await client.query("UPDATE users SET refresh_token = $1, previous_refresh_token = NULL, refresh_token_rotated_at = NULL, updated_at = NOW() WHERE id = $2", [refreshToken, user.id]);
      await auditService.record({
        actor: { id: user.id, role: user.role },
        action: "LOGIN_SUCCEEDED",
        entityType: "USER",
        entityId: user.id,
        newValues: { role: user.role },
        metadata: { provider: profile.provider },
      }, { client, request });
      await client.query("COMMIT");
      return { flowType: "LOGIN", user: safeUser(user), accessToken, refreshToken, isNewUser: created, returnTo: flow.return_to };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        client.release();
        client = null;
        const concurrentlyLinked = await providerRepository.findUserByIdentity(profile.provider, profile.providerUserId);
        if (concurrentlyLinked) return this.loginIdentity({ flow, profile, request });
        const existingEmail = profile.email ? await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1", [profile.email]) : null;
        if (existingEmail?.rows[0]) {
          throw serviceError(
            "This email already has a RupKotha account. Sign in to it, then link this provider in Security settings.",
            "ACCOUNT_LINK_REQUIRED",
            409
          );
        }
        throw serviceError("This provider account could not be linked. Please try again.", "PROVIDER_LINK_CONFLICT", 409);
      }
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async unlinkIdentity({ userId, providerName, request }) {
    const provider = String(providerName || "").toLowerCase();
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        "SELECT id, role, password_hash FROM users WHERE id = $1 FOR UPDATE",
        [userId]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "CUSTOMER") throw serviceError("Account not found.", "ACCOUNT_UNAVAILABLE", 404);
      const providerCount = await providerRepository.countForUser(userId, client);
      const hasThisProvider = await client.query(
        "SELECT 1 FROM user_providers WHERE user_id = $1 AND provider = $2",
        [userId, provider]
      );
      if (!hasThisProvider.rows[0]) throw serviceError("This provider is not linked to your account.", "PROVIDER_NOT_LINKED", 404);
      if (!user.password_hash && providerCount <= 1) {
        throw serviceError("Set a password or link another provider before removing this sign-in method.", "LAST_AUTH_METHOD", 409);
      }
      await providerRepository.remove(userId, provider, client);
      const remainingProvider = await client.query(
        `SELECT provider, provider_user_id FROM user_providers
         WHERE user_id = $1 ORDER BY created_at, provider LIMIT 1`,
        [userId]
      );
      await client.query(
        `UPDATE users SET authprovider = $1, oauth_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [remainingProvider.rows[0]?.provider || "local", remainingProvider.rows[0]?.provider_user_id || null, userId]
      );
      await auditService.record({
        actor: { id: userId, role: user.role },
        action: "ACCOUNT_PROVIDER_UNLINKED",
        entityType: "USER",
        entityId: userId,
        previousValues: { provider },
      }, { client, request });
      await client.query("COMMIT");
      return { success: true, provider };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  listSupportedProviders() {
    return oauthRegistry.list();
  }
}

module.exports = new OAuthService();

const BaseOAuthProvider = require("../BaseOAuthProvider");

/**
 * Google OAuth 2.0 Provider
 */
class GoogleProvider extends BaseOAuthProvider {
  constructor() {
    super("google");
  }

  getClientId() {
    return (process.env.GOOGLE_CLIENT_ID || "").trim();
  }

  getClientSecret() {
    return (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  }

  getCallbackUrl() {
    return (
      (process.env.GOOGLE_CALLBACK_URL || "").trim() ||
      `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/oauth/google/callback`
    );
  }

  isConfigured() {
    const id = this.getClientId();
    const secret = this.getClientSecret();
    return Boolean(
      id &&
      secret &&
      id !== "your_google_client_id_here" &&
      secret !== "your_google_client_secret_here"
    );
  }

  /**
   * Builds Google consent screen redirect URL
   */
  getAuthorizationUrl(state = "", { codeChallenge = null } = {}) {
    if (!this.isConfigured()) {
      throw new Error(
        "Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not configured in server/.env."
      );
    }

    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getCallbackUrl(),
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    if (state) {
      params.append("state", state);
    }
    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges code for tokens and fetches Google user profile
   */
  async getUserProfile(code, { codeVerifier = null } = {}) {
    if (!code) {
      throw new Error("Authorization code is required to retrieve Google profile.");
    }

    // 1. Exchange code for access_token and id_token
    const tokenBody = new URLSearchParams({
      code,
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      redirect_uri: this.getCallbackUrl(),
      grant_type: "authorization_code",
    });
    if (codeVerifier) tokenBody.set("code_verifier", codeVerifier);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Google token exchange failed:", String(tokenData.error || "unknown_error").slice(0, 80));
      throw new Error(
        tokenData.error_description || tokenData.error || "Failed to exchange Google authorization code"
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok || profileData.error) {
      console.error("Google userinfo request failed with status:", profileResponse.status);
      throw new Error(
        profileData.error_description || "Failed to retrieve user profile from Google"
      );
    }

    // 3. Return normalized profile format
    return {
      provider: "google",
      providerUserId: String(profileData.sub),
      name: profileData.name || profileData.email?.split("@")[0] || "Google User",
      email: profileData.email ? profileData.email.toLowerCase() : null,
      emailVerified: Boolean(profileData.email_verified),
      profilePicture: profileData.picture || null,
      raw: profileData,
    };
  }
}

module.exports = GoogleProvider;


const BaseOAuthProvider = require("../BaseOAuthProvider");

/**
 * GitHub OAuth Provider (Example of adding another provider easily)
 */
class GitHubProvider extends BaseOAuthProvider {
  constructor() {
    super("github");
  }

  getClientId() {
    return (process.env.GITHUB_CLIENT_ID || "").trim();
  }

  getClientSecret() {
    return (process.env.GITHUB_CLIENT_SECRET || "").trim();
  }

  getCallbackUrl() {
    return (
      (process.env.GITHUB_CALLBACK_URL || "").trim() ||
      `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/oauth/github/callback`
    );
  }

  isConfigured() {
    const id = this.getClientId();
    const secret = this.getClientSecret();
    return Boolean(
      id &&
      secret &&
      id !== "your_github_client_id_here" &&
      secret !== "your_github_client_secret_here"
    );
  }

  getAuthorizationUrl(state = "") {
    if (!this.isConfigured()) {
      throw new Error(
        "GitHub OAuth credentials (GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET) are not configured in server/.env."
      );
    }

    const params = new URLSearchParams({
      client_id: this.getClientId(),
      redirect_uri: this.getCallbackUrl(),
      scope: "read:user user:email",
    });

    if (state) params.append("state", state);

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async getUserProfile(code) {
    if (!code) {
      throw new Error("Authorization code is required to retrieve GitHub profile.");
    }

    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
        code,
        redirect_uri: this.getCallbackUrl(),
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || "Failed to exchange GitHub authorization code");
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    const userData = await userRes.json();

    // 3. Fetch primary verified email if not public
    let email = userData.email || null;
    let emailVerified = false;

    try {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const verifiedEmail = emails.find((entry) => entry.primary && entry.verified) || emails.find((entry) => entry.verified);
        if (verifiedEmail) {
          email = verifiedEmail.email;
          emailVerified = true;
        }
      }
    } catch {
      // Keep a public profile email unverified if GitHub's verified email endpoint is unavailable.
    }

    return {
      provider: "github",
      providerUserId: String(userData.id),
      name: userData.name || userData.login,
      email: email ? email.toLowerCase() : null,
      emailVerified,
      profilePicture: userData.avatar_url || null,
      raw: userData,
    };
  }
}

module.exports = GitHubProvider;


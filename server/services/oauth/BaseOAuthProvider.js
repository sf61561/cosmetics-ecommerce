/**
 * BaseOAuthProvider
 * Abstract base class that all OAuth providers must implement.
 * This guarantees a uniform interface across all OAuth providers
 * (Google, GitHub, Facebook, Apple, Discord, etc.).
 */
class BaseOAuthProvider {
  constructor(name) {
    if (!name) {
      throw new Error("OAuth provider must have a unique name identifier.");
    }
    this.name = name;
  }

  /**
   * Check if this provider is configured with the necessary credentials.
   * @returns {boolean}
   */
  isConfigured() {
    throw new Error(`isConfigured() must be implemented by ${this.name} provider.`);
  }

  /**
   * Generates the authorization URL to redirect the user to the provider's consent screen.
   * @param {string} state - Random security state or redirect parameter
   * @returns {string} The full redirect authorization URL
   */
  getAuthorizationUrl(state) {
    throw new Error(`getAuthorizationUrl() must be implemented by ${this.name} provider.`);
  }

  /**
   * Exchanges authorization code for user profile.
   * @param {string} code - The code returned by provider in redirect
   * @param {string} [state] - Optional security state parameter
   * @returns {Promise<NormalizedOAuthProfile>}
   * 
   * NormalizedOAuthProfile format:
   * {
   *   provider: string,         // e.g. "google"
   *   providerUserId: string,   // e.g. "104928172938172"
   *   name: string,             // e.g. "Jane Doe"
   *   email: string,            // e.g. "jane@gmail.com"
   *   emailVerified: boolean,   // e.g. true
   *   profilePicture: string,   // e.g. "https://..."
   *   raw: object               // Raw provider response
   * }
   */
  async getUserProfile(code, state) {
    throw new Error(`getUserProfile() must be implemented by ${this.name} provider.`);
  }
}

module.exports = BaseOAuthProvider;


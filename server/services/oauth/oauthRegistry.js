const GoogleProvider = require("./providers/googleProvider");
const GitHubProvider = require("./providers/githubProvider");

/**
 * OAuthProviderRegistry
 * Central registry that manages all available OAuth providers.
 * 
 * To add a new provider:
 * 1. Create a new provider class extending BaseOAuthProvider (in ./providers)
 * 2. Add it to the providers map below!
 */
class OAuthProviderRegistry {
  constructor() {
    this.providers = new Map();

    // Register default providers
    this.register(new GoogleProvider());
    this.register(new GitHubProvider());
  }

  /**
   * Register a new OAuth provider instance
   */
  register(provider) {
    if (!provider || !provider.name) {
      throw new Error("Provider must be an instance with a valid name.");
    }
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  /**
   * Get an OAuth provider by name
   */
  get(providerName) {
    if (!providerName) return null;
    return this.providers.get(providerName.toLowerCase()) || null;
  }

  /**
   * List all registered providers and their configuration status
   */
  list() {
    const result = [];
    for (const [name, provider] of this.providers.entries()) {
      result.push({
        name,
        isConfigured: provider.isConfigured(),
      });
    }
    return result;
  }
}

module.exports = new OAuthProviderRegistry();


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const interactionService = {
  /**
   * Record customer interaction (VIEW, ADD_TO_CART, WISHLIST)
   * Non-blocking and fail-safe: failures never break UI navigation or shopping flows
   */
  async recordInteraction({ productId, type }) {
    if (!productId || !type) return null;

    try {
      const res = await fetch(`${API_BASE}/api/interactions`, {
        method: "POST",
        credentials: "include", // Pass cookies (accessToken and rupkotha_session_id)
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ productId, type }),
      });

      if (!res.ok) {
        // Silently log in development without disturbing customer
        return null;
      }

      return await res.json();
    } catch {
      // Non-blocking fail-safe
      return null;
    }
  },
};


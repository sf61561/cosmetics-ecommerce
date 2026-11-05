"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/services/apiConfig";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isLoggingOut: false,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  setAuthSession: () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // Clean up any legacy token storage in localStorage (security guarantee)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("token");
    }
  }, []);

  // Update user state helper
  const saveAuthSession = useCallback((newUser) => {
    setUser((prevUser) => {
      if (
        prevUser &&
        newUser &&
        prevUser.id === newUser.id &&
        prevUser.name === newUser.name &&
        prevUser.email === newUser.email &&
        prevUser.phone === newUser.phone &&
        prevUser.role === newUser.role &&
        prevUser.emailVerified === newUser.emailVerified &&
        prevUser.authProvider === newUser.authProvider &&
        prevUser.hasPassword === newUser.hasPassword &&
        prevUser.profilePicture === newUser.profilePicture
      ) {
        return prevUser;
      }
      return newUser;
    });
  }, []);

  // Silent refresh token handler (relies strictly on HTTP-only refreshToken cookie)
  const refreshAuth = useCallback(async () => {
    try {
      const apiUrl = `${API_BASE}/api/auth/refresh-token`;

      const res = await fetch(apiUrl, {
        method: "POST",
        credentials: "include", // sends HTTP-only refreshToken cookie
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        saveAuthSession(data.user);
        return data.user;
      } else {
        saveAuthSession(null);
        return null;
      }
    } catch (err) {
      console.warn("Silent token refresh failed:", err);
      saveAuthSession(null);
      return null;
    }
  }, [saveAuthSession]);

  // Session verification handler via HTTP-only cookie
  const checkSession = useCallback(async () => {
    try {
      const apiUrl = `${API_BASE}/api/auth/me`;

      const res = await fetch(apiUrl, {
        method: "GET",
        credentials: "include", // browser sends HTTP-only accessToken cookie
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          saveAuthSession(data.user);
          return data.user;
        }
      } else {
        // If accessToken is expired, attempt refresh via refreshToken cookie
        const refreshedUser = await refreshAuth();
        if (!refreshedUser) {
          saveAuthSession(null);
        }
        return refreshedUser;
      }
    } catch (err) {
      console.warn("Session verification error:", err);
      saveAuthSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthSession, refreshAuth]);

  // Initial session check on app mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // bfcache protection: re-validate session whenever page is restored from back/forward cache
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page was restored from back/forward cache (bfcache)
        checkSession();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [checkSession]);

  /**
   * Log in user with credentials
   * Tokens are set directly into secure HTTP-only cookies by the server.
   */
  const login = useCallback(
    async ({ identifier, password, rememberMe = false }) => {
      const apiUrl = `${API_BASE}/api/auth/login`;

      const response = await fetch(apiUrl, {
        method: "POST",
        credentials: "include", // permits setting HTTP-only cookies
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const error = new Error(data.message || "Invalid credentials.");
        error.code = data.code;
        error.field = data.field;
        throw error;
      }

      saveAuthSession(data.user);
      return data;
    },
    [saveAuthSession]
  );

  /**
   * Log out user
   * Clears HTTP-only cookies on the server and resets client state.
   * Redirects cleanly to /auth/login without triggering route guard ?redirect= parameters.
   */
  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const apiUrl = `${API_BASE}/api/auth/logout`;

      await fetch(apiUrl, {
        method: "POST",
        credentials: "include", // passes cookie to be cleared on server
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.warn("Logout request error:", err);
    } finally {
      saveAuthSession(null);
      // Replace redirect to /auth/login: resets all in-memory React state cleanly and prevents admin page from lingering in history
      if (typeof window !== "undefined") {
        window.location.replace("/auth/login");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [router, saveAuthSession]);

  /**
   * Set user profile in state
   */
  const setAuthSession = useCallback(
    (newUser) => {
      saveAuthSession(newUser);
    },
    [saveAuthSession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
        isAuthenticated: Boolean(user),
        login,
        logout,
        setAuthSession,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

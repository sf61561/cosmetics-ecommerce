"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const AdminThemeContext = createContext({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

function subscribe(callback) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    const saved = localStorage.getItem("eloura_admin_theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot() {
  return "light";
}

export function AdminThemeProvider({ children }) {
  // useSyncExternalStore provides seamless SSR (getServerSnapshot) & client hydration (getSnapshot)
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = (newTheme) => {
    if (newTheme !== "light" && newTheme !== "dark") return;
    try {
      localStorage.setItem("eloura_admin_theme", newTheme);
      // Notify listeners in the current window of the theme update
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignore storage errors in private browsing/sandboxes
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <AdminThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
}

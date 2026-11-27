"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "@/context/AdminThemeContext";
import SuperadminSidebar from "@/components/superadmin/SuperadminSidebar";
import SuperadminNavbar from "@/components/superadmin/SuperadminNavbar";
import { FaShieldAlt } from "react-icons/fa";

function SuperadminLayoutContent({ children }) {
  const { user, isLoading, isLoggingOut, refreshAuth } = useAuth();
  const pathname = usePathname();
  const { isDark } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // bfcache protection: re-check session when restored from back/forward cache
  useEffect(() => {
    const handlePageShow = async (event) => {
      if (event.persisted) {
        try {
          const freshUser = await refreshAuth();
          if (!freshUser) {
            window.location.replace("/auth/login");
          } else if (freshUser.role === "ADMIN") {
            window.location.replace("/admin");
          } else if (freshUser.role !== "SUPERADMIN") {
            window.location.replace("/");
          }
        } catch {
          window.location.replace("/auth/login");
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [refreshAuth]);

  useEffect(() => {
    if (!isLoading && !isLoggingOut) {
      if (!user) {
        window.location.replace("/auth/login");
      } else if (user.role === "ADMIN") {
        window.location.replace("/admin");
      } else if (user.role !== "SUPERADMIN") {
        window.location.replace("/");
      }
    }
  }, [user, isLoading, isLoggingOut, pathname]);

  if (isLoading || isLoggingOut) {
    return (
      <div
        suppressHydrationWarning
        className={`flex min-h-screen items-center justify-center transition-colors ${
          isDark ? "dark bg-gray-950 text-gray-100" : "bg-purple-50/40 text-gray-900"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B5CF6] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {isLoggingOut ? "Signing out..." : "Verifying Super Admin Access..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "SUPERADMIN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-purple-50/40 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-sm">
          <FaShieldAlt className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Access Forbidden</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-sm">
          This governance console is restricted exclusively to Super Administrators.
        </p>
        <Link
          href={user.role === "ADMIN" ? "/admin" : "/"}
          className="mt-6 rounded-full bg-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#7C3AED]"
        >
          {user.role === "ADMIN" ? "Go to Admin Panel" : "Return to Store"}
        </Link>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? "dark bg-gray-950 text-gray-100" : "bg-gray-50/60 text-gray-900"
      }`}
    >
      <SuperadminSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex min-h-screen flex-col min-w-0 lg:pl-64">
        <SuperadminNavbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className="pt-16 flex-1 flex flex-col">
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function SuperadminLayout({ children }) {
  return (
    <AdminThemeProvider>
      <SuperadminLayoutContent>{children}</SuperadminLayoutContent>
    </AdminThemeProvider>
  );
}

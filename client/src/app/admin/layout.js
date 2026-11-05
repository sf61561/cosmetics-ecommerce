"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "@/context/AdminThemeContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { FaShieldAlt } from "react-icons/fa";

function AdminLayoutContent({ children }) {
  const { user, isLoading, isLoggingOut, refreshAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useAdminTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // bfcache protection for admin pages: immediate re-check when restored from back/forward cache
  useEffect(() => {
    const handlePageShow = async (event) => {
      if (event.persisted) {
        try {
          const freshUser = await refreshAuth();
          if (!freshUser || freshUser.role !== "ADMIN") {
            window.location.replace("/auth/login");
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
    // Only redirect if session expired naturally; skip if an explicit logout is in progress
    if (!isLoading && !isLoggingOut) {
      if (!user) {
        window.location.replace("/auth/login");
      } else if (user.role !== "ADMIN") {
        window.location.replace("/");
      }
    }
  }, [user, isLoading, isLoggingOut, pathname]);

  // Loading state
  if (isLoading || isLoggingOut) {
    return (
      <div
        suppressHydrationWarning
        className={`flex min-h-screen items-center justify-center transition-colors ${
          isDark ? "dark bg-gray-950 text-gray-100" : "bg-[#FBF0F0] text-gray-900"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9B4F5E] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {isLoggingOut ? "Signing out..." : "Verifying Admin Access..."}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Non-admin (Customer trying to access Admin route)
  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF0F0] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-sm">
          <FaShieldAlt className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Access Forbidden</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-sm">
          Customers are not permitted to access administrative pages. Redirecting you to the home page...
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-[#9B4F5E] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#843f4e]"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  // User is verified ADMIN: Render full administrative dashboard layout
  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? "dark bg-gray-950 text-gray-100" : "bg-gray-50/60 text-gray-900"
      }`}
    >
      {/* Fixed Left Sidebar */}
      <AdminSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      {/* Main Column (offset by 16rem/w-64 on desktop) */}
      <div className="flex min-h-screen flex-col min-w-0 lg:pl-64">
        {/* Fixed Top Navbar */}
        <AdminNavbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* Content Container offset below fixed h-16 navbar */}
        <div className="pt-16 flex-1 flex flex-col">
          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminThemeProvider>
  );
}

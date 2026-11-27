"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminHomeRedirect({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isBackofficeUser = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (!isLoading) {
      if (isSuperAdmin) {
        router.replace("/superadmin");
      } else if (isAdmin) {
        router.replace("/admin");
      }
    }
  }, [isSuperAdmin, isAdmin, isLoading, router]);

  if (isLoading || isBackofficeUser) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-600"
        role="status"
        aria-live="polite"
      >
        Checking your account...
      </main>
    );
  }

  return children;
}

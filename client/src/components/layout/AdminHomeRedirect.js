"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminHomeRedirect({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isLoading && isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || isAdmin) {
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

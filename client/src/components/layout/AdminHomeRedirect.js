"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useStorefrontPreview } from "@/context/StorefrontPreviewContext";
import { isStorefrontPreviewActive } from "@/services/apiConfig";

export default function AdminHomeRedirect({ children }) {
  const { user, isLoading } = useAuth();
  const { isPreviewMode, isChecking, hasChecked } = useStorefrontPreview();
  const router = useRouter();
  const waitingForPreviewVerification = isChecking || (isStorefrontPreviewActive() && !hasChecked);
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isBackofficeUser = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (!isLoading && !waitingForPreviewVerification && !isPreviewMode) {
      if (isSuperAdmin) {
        router.replace("/superadmin");
      } else if (isAdmin) {
        router.replace("/admin");
      }
    }
  }, [isSuperAdmin, isAdmin, isLoading, waitingForPreviewVerification, isPreviewMode, router]);

  // Always render the customer storefront in verified Storefront Preview mode
  if (isPreviewMode) {
    return children;
  }

  if (isLoading || waitingForPreviewVerification || isBackofficeUser) {
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

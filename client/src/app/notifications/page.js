"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function NotificationsRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/profile/notifications");
      } else {
        router.replace("/auth/login?redirect=/profile/notifications");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#F7F4FA] flex flex-col justify-between">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
          Loading notifications...
        </div>
      </div>
      <Footer />
    </div>
  );
}


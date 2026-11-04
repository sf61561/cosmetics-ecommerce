"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasHandledRef = useRef(false);

  const name = searchParams.get("name") || "there";
  const role = searchParams.get("role") || "CUSTOMER";
  const isNewUser = searchParams.get("newUser") === "true";
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam || hasHandledRef.current) return;
    hasHandledRef.current = true;

    // Immediately forward to home or admin with no waiting screen
    const target = role === "ADMIN" ? "/admin" : "/";
    router.replace(target);
  }, [errorParam, role, router]);

  if (errorParam) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl text-center">
        <div className="py-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-200">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2
            className="text-2xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Authentication Failed
          </h2>
          <p className="text-sm text-gray-600 mb-6">{errorParam}</p>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-2.5 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl text-center">
      <div className="py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-200">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          className="text-2xl font-semibold text-gray-800 mb-2"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {isNewUser ? `Welcome, ${name}!` : `Welcome back, ${name}!`}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {isNewUser
            ? "Your account has been created successfully."
            : "You have signed in successfully."}
        </p>
        <p className="text-xs text-[#9B4F5E] font-medium animate-pulse">
          {role === "ADMIN"
            ? "Redirecting you to the Admin Panel..."
            : "Redirecting you to RupKotha..."}
        </p>
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Image */}
      <Image
        src="/images/background_image/Login And register Background.jpg"
        alt="Background"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-pink-200/40 via-pink-100/20 to-purple-100/30" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl text-center">
              <div className="w-12 h-12 border-3 border-[#9B4F5E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Verifying session...</p>
            </div>
          }
        >
          <OAuthSuccessContent />
        </Suspense>
      </div>
    </div>
  );
}

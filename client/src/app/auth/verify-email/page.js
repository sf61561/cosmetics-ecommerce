"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { API_BASE } from "@/services/apiConfig";

// ─── Icons ───
function CheckIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-200">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-200">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
}

function AlreadyVerifiedIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    </div>
  );
}

function LogoLeaf() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#9B7CB8] -mt-2 ml-0.5">
      <path d="M12 2C8 6 4 10 4 14a8 8 0 0 0 16 0c0-4-4-8-8-12z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

// ─── Verify Email Content ───
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "" : "No verification token was provided in the link."
  );
  const [countdown, setCountdown] = useState(5);
  const [resendEmail, setResendEmail] = useState(() => searchParams.get("email") || "");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendStatus, setResendStatus] = useState(null); // null | "success" | "already_verified" | "error"
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!token || hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;

    // Immediately clean token from browser address bar to avoid referrer leakage & history retention
    if (typeof window !== "undefined") {
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    async function verify() {
      try {
        const apiUrl = `${API_BASE}/api/auth/verify-email`;

        // Send POST to verify token, ensuring link scanners / email crawlers don't consume GET links
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.alreadyVerified || data.data?.alreadyVerified) {
            setStatus("already_verified");
            setMessage(
              data.message ||
                "Your email address is already verified! You can proceed to log in."
            );
          } else {
            setStatus("success");
            setMessage(data.message || "Email verified successfully!");
          }
        } else {
          // If the message indicates it was already used or verified, show friendly already_verified view
          if (
            data.alreadyVerified ||
            data.message?.toLowerCase().includes("already") ||
            data.message?.toLowerCase().includes("used")
          ) {
            setStatus("already_verified");
            setMessage(
              data.message ||
                "This verification link has already been used. Please log in to your account."
            );
          } else {
            setStatus("error");
            setMessage(
              data.message ||
                "Verification failed. The link may have expired or already been used."
            );
          }
        }
      } catch (err) {
        console.error("Verification network error:", err);
        setStatus("error");
        setMessage(
          "Could not connect to the server. Please check your internet connection."
        );
      }
    }

    verify();
  }, [token]);

  // Auto-redirect countdown on success or already verified
  useEffect(() => {
    if (status !== "success" && status !== "already_verified") return;

    if (countdown <= 0) {
      router.push("/auth/login");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown, router]);

  // Handle Resend Request
  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    setResendMessage("");
    setResendStatus(null);

    try {
      const apiUrl = `${API_BASE}/api/auth/resend-verification`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json();

      if (data.alreadyVerified) {
        setResendStatus("already_verified");
        setResendMessage(
          data.message ||
            "This email address is already verified. You can log in directly."
        );
      } else if (res.ok) {
        setResendStatus("success");
        setResendMessage(
          data.message || "If an account exists, a new verification link was sent."
        );
      } else {
        setResendStatus("error");
        setResendMessage(data.message || "Failed to send verification link.");
      }
    } catch {
      setResendStatus("error");
      setResendMessage("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <div className="w-full rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl text-center">
      {status === "loading" && (
        <div className="py-8">
          <div className="w-12 h-12 border-3 border-[#9B4F5E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2
            className="text-2xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Verifying Your Email
          </h2>
          <p className="text-sm text-gray-600">
            Please wait a moment while we verify your account...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="py-4">
          <CheckIcon />
          <h2
            className="text-2xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Email Verified!
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Redirecting to sign in automatically in <span className="font-bold text-[#9B4F5E]">{countdown}s</span>...
          </p>

          <Link
            href="/auth/login"
            className="inline-block w-full py-3 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95"
          >
            Sign In Now
          </Link>
        </div>
      )}

      {status === "already_verified" && (
        <div className="py-4">
          <AlreadyVerifiedIcon />
          <h2
            className="text-2xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Email Already Verified
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Redirecting to sign in automatically in <span className="font-bold text-[#9B4F5E]">{countdown}s</span>...
          </p>

          <Link
            href="/auth/login"
            className="inline-block w-full py-3 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95"
          >
            Sign In to Your Account
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <ErrorIcon />
          <h2
            className="text-2xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Verification Failed
          </h2>
          <p className="text-sm text-red-600 mb-6 bg-red-50/80 border border-red-200 rounded-lg p-3">
            {message}
          </p>

          <div className="border-t border-gray-200/60 pt-5 mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Request a new verification link
            </h3>
            <form onSubmit={handleResend} className="flex flex-col gap-2 mb-4">
              <input
                type="email"
                placeholder="Enter your registered email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-full bg-white/70 border border-white/80 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#C47B8A]/40"
              />
              <button
                type="submit"
                disabled={resendLoading}
                className="w-full h-11 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide transition-all hover:bg-[#843f4e] disabled:opacity-50"
              >
                {resendLoading ? "Sending Link..." : "Resend Verification Email"}
              </button>
            </form>
            {resendMessage && (
              <div
                className={`text-xs rounded-lg p-3 mb-3 text-left ${
                  resendStatus === "already_verified"
                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                    : resendStatus === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <p>{resendMessage}</p>
                {resendStatus === "already_verified" && (
                  <Link
                    href="/auth/login"
                    className="inline-block mt-2 font-semibold text-[#9B4F5E] hover:underline"
                  >
                    Click here to Sign In &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>

          <Link
            href="/auth/login"
            className="inline-block text-xs text-[#9B4F5E] hover:underline mt-2"
          >
            Return to Sign In
          </Link>
        </div>
      )}
    </div>
    </>
  );
}

// ─── Verify Email Page ───
export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-start pt-16 px-4 pb-8">
      {/* ── Background image ── */}
      <Image
        src="/images/background_image/Login And register Background.jpg"
        alt="Background"
        fill
        priority
        className="object-fill"
        sizes="100vw"
      />

      {/* ── Pink/lavender overlay tint ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-200/40 via-pink-100/20 to-purple-100/30" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Top Navigation: Brand Logo (Home link) */}
        <div className="w-full flex items-center justify-center mb-5">
          <Link
            href="/"
            className="text-3xl font-semibold tracking-wide text-gray-800 hover:text-[#9B4F5E] transition-colors"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            aria-label="Elourá Home"
          >
            Elourá
          </Link>
        </div>

        {/* Suspense wrapper for Next.js useSearchParams */}
        <Suspense
          fallback={
            <div className="w-full rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl text-center">
              <div className="w-10 h-10 border-2 border-[#9B4F5E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">Loading verification...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}


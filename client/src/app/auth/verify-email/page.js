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

function MailPendingIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-pink-100 text-[#9B4F5E] flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-200">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    </div>
  );
}

function EditEmailIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-pink-100 text-[#9B4F5E] flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-200">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </div>
  );
}

/**
 * Masks an email for privacy and security: e.g. syedfahad9884@gmail.com -> sy****84@gmail.com
 */
function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "your email address";
  }
  const [local, domain] = email.trim().split("@");
  if (!domain) return "your email address";
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  if (local.length <= 4) {
    return `${local[0]}*${local.slice(-1)}@${domain}`;
  }
  const prefix = local.slice(0, 2);
  const suffix = local.slice(-2);
  return `${prefix}****${suffix}@${domain}`;
}

// ─── Verify Email Content ───
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(token ? "loading" : "pending");
  const [message, setMessage] = useState(
    token
      ? ""
      : "Please check your inbox to activate your account."
  );
  const [countdown, setCountdown] = useState(5);

  // Email and resend state
  const [resendEmail, setResendEmail] = useState(() => searchParams.get("email") || "");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendStatus, setResendStatus] = useState(null); // null | "success" | "already_verified" | "error"
  const [cooldown, setCooldown] = useState(0);

  // Edit mistyped email view state (toggleable link at bottom)
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [changeCurrentEmail, setChangeCurrentEmail] = useState(() => searchParams.get("email") || "");
  const [changePassword, setChangePassword] = useState("");
  const [changeNewEmail, setChangeNewEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState("");

  const hasRequestedRef = useRef(false);

  // Countdown timer for resend rate-limit cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

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
                "Verification link is invalid or has expired."
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

  // Handle Resend Request (no manual input required when email is known)
  const handleResend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = (resendEmail || "").trim();

    if (!targetEmail) {
      setResendStatus("error");
      setResendMessage("Please enter your registered email below to receive a new link.");
      return;
    }

    if (/^www\./i.test(targetEmail)) {
      setResendStatus("error");
      setResendMessage("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setResendStatus(null);

    try {
      const apiUrl = `${API_BASE}/api/auth/resend-verification`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
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
          data.message || `A fresh verification link has been sent to ${maskEmail(targetEmail)}!`
        );
        setCooldown(60);
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

  // Handle Change Mistyped Email Request
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setChangeError("");

    const normCurrent = (changeCurrentEmail || resendEmail).trim();
    const normNew = changeNewEmail.trim();

    if (!normCurrent) {
      setChangeError("Please enter your current registered email.");
      return;
    }

    if (!changePassword) {
      setChangeError("Please enter your account password to confirm ownership.");
      return;
    }

    if (!normNew) {
      setChangeError("Please enter your new email address.");
      return;
    }

    if (/^www\./i.test(normNew)) {
      setChangeError("Email address cannot start with 'www.'. Please remove 'www.' from the beginning.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normNew)) {
      setChangeError("Please enter a valid new email address.");
      return;
    }

    if (normCurrent.toLowerCase() === normNew.toLowerCase()) {
      setChangeError("The new email must be different from your current email.");
      return;
    }

    setChangeLoading(true);

    try {
      const apiUrl = `${API_BASE}/api/auth/change-unverified-email`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: normCurrent,
          password: changePassword,
          newEmail: normNew,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const maskedNew = maskEmail(normNew);
        setResendEmail(normNew);
        setChangeCurrentEmail(normNew);
        setChangeNewEmail("");
        setChangePassword("");
        setIsEditingEmail(false);
        setResendStatus("success");
        setResendMessage(
          `Email updated to ${maskedNew}! A fresh verification link has been sent to your inbox. Please check your inbox and verify before logging in.`
        );
        setCooldown(60);

        if (typeof window !== "undefined") {
          const newUrl = `${window.location.pathname}?email=${encodeURIComponent(normNew)}`;
          window.history.replaceState(null, "", newUrl);
        }
      } else {
        setChangeError(data.message || "Failed to update email. Please check your password.");
      }
    } catch {
      setChangeError("Network error. Please check your connection and try again.");
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <div className="w-full rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center">
        {status === "loading" && (
          <div className="py-8">
            <div className="w-12 h-12 border-3 border-[#9B4F5E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2
              className="text-2xl font-semibold text-gray-800 mb-2 font-logo tracking-[0.1em]"
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
              className="text-2xl font-semibold text-gray-800 mb-2 font-logo tracking-[0.1em]"
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
              className="text-2xl font-semibold text-gray-800 mb-2 font-logo tracking-[0.1em]"
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

        {(status === "pending" || status === "error") && (
          <div className="py-2">
            {!isEditingEmail ? (
              /* ── Main Screen: Clean, No Input Fields ── */
              <>
                {status === "pending" ? (
                  <>
                    <MailPendingIcon />
                    <h2
                      className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 font-logo tracking-[0.1em]"
                    >
                      Verify Your Email
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                      We&apos;ve sent a verification link to{" "}
                      <span className="font-semibold text-gray-900 bg-white/70 px-2 py-0.5 rounded-md border border-gray-200/60 inline-block shadow-2xs">
                        {maskEmail(resendEmail)}
                      </span>
                      .<br />
                      Please check your inbox to activate your account.
                    </p>
                  </>
                ) : (
                  <>
                    <ErrorIcon />
                    <h2
                      className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 font-logo tracking-[0.1em]"
                    >
                      Verification Link Invalid
                    </h2>
                    <p className="text-xs sm:text-sm text-red-600 mb-4 bg-red-50/80 border border-red-200 rounded-lg p-2.5 leading-relaxed">
                      {message}
                    </p>
                    {resendEmail && (
                      <p className="text-xs text-gray-600 mb-4">
                        Send a new link to{" "}
                        <span className="font-semibold text-gray-900">
                          {maskEmail(resendEmail)}
                        </span>
                      </p>
                    )}
                  </>
                )}

                {/* Fallback input ONLY if user arrived without any email in query string */}
                {!resendEmail && (
                  <div className="text-left mb-3">
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider pl-1">
                      Enter Registered Email
                    </label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full h-11 px-4 mt-1 rounded-full bg-white/70 border border-white/80 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#C47B8A]/40"
                    />
                  </div>
                )}

                {/* ── Single Resend Action Button (No inputs required) ── */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || cooldown > 0}
                  className="w-full h-11 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide transition-all hover:bg-[#843f4e] disabled:opacity-50 cursor-pointer shadow-md mb-3"
                >
                  {resendLoading
                    ? "Sending Link..."
                    : cooldown > 0
                    ? `Resend Link in ${cooldown}s`
                    : "Resend Verification Email"}
                </button>

                {/* ── Status Feedback Banner ── */}
                {resendMessage && (
                  <div
                    className={`text-xs rounded-xl p-3 mb-3 text-left leading-relaxed ${
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

                {/* ── Bottom Section: Edit Email Link & Return to Sign In ── */}
                <div className="border-t border-gray-200/60 pt-4 mt-4 flex flex-col items-center gap-2">
                  {resendEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEmail(true);
                        setChangeError("");
                        setChangeCurrentEmail(resendEmail);
                      }}
                      className="text-xs text-gray-600 hover:text-[#9B4F5E] transition-colors underline font-medium cursor-pointer"
                    >
                      Wrong email address? Edit it
                    </button>
                  )}
                  <Link
                    href="/auth/login"
                    className="text-xs text-[#9B4F5E] hover:underline font-medium"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </>
            ) : (
              /* ── Edit Mistyped Email Screen (Shown only when clicked) ── */
              <div className="text-left">
                <div className="text-center">
                  <EditEmailIcon />
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1.5 font-logo tracking-[0.1em]"
                  >
                    Edit Email Address
                  </h2>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Signed up with a typo? Enter your account password to update your address and receive a new activation link.
                  </p>
                </div>

                <form onSubmit={handleChangeEmail} className="flex flex-col gap-2.5 mb-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider pl-1">
                      Current (Mistyped) Email
                    </label>
                    <input
                      type="email"
                      value={changeCurrentEmail}
                      onChange={(e) => setChangeCurrentEmail(e.target.value)}
                      required
                      className="w-full h-10 px-4 mt-1 rounded-full bg-white/70 border border-white/80 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#C47B8A]/40"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider pl-1">
                      Account Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your account password"
                        value={changePassword}
                        onChange={(e) => setChangePassword(e.target.value)}
                        required
                        className="w-full h-10 pl-4 pr-10 rounded-full bg-white/70 border border-white/80 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#C47B8A]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider pl-1">
                      New (Correct) Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. name@gmail.com"
                      value={changeNewEmail}
                      onChange={(e) => setChangeNewEmail(e.target.value)}
                      required
                      className="w-full h-10 px-4 mt-1 rounded-full bg-white/70 border border-white/80 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#C47B8A]/40"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="w-full h-11 mt-2 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide transition-all hover:bg-[#843f4e] disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {changeLoading ? "Updating Email..." : "Update Email & Send Verification Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setChangeError("");
                    }}
                    className="w-full text-xs text-gray-500 hover:text-gray-800 transition-colors py-1 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                </form>

                {changeError && (
                  <div className="text-xs rounded-xl p-3 mb-2 bg-red-50 border border-red-200 text-red-800 text-left leading-relaxed">
                    <p>{changeError}</p>
                  </div>
                )}
              </div>
            )}
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

      {/* ── Top-Left: Back to Home Button ── */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/70 hover:bg-white/95 backdrop-blur-md border border-white/60 text-xs sm:text-sm font-medium text-gray-700 hover:text-[#9B4F5E] shadow-xs transition-all duration-200 group cursor-pointer"
        aria-label="Back to home"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:-translate-x-0.5"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back to Home</span>
      </Link>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Top Navigation: Brand Logo (Home link) */}
        <div className="w-full flex items-center justify-center mb-6">
          <Link
            href="/"
            className="flex flex-col items-center group select-none"
            aria-label="Elourá Home"
          >
            <span className="font-logo text-3xl font-semibold tracking-[0.24em] text-gray-900 group-hover:text-[#9B4F5E] transition-colors pl-[0.24em]">
              ELOURÁ
            </span>
            <div className="w-12 h-px bg-gray-400/50 mt-1.5 mb-1" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-gray-600 font-medium pl-[0.25em]">
              Korean Skincare
            </span>
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


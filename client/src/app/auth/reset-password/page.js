"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [message, setMessage] = useState(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token") || "";
    if (resetToken) {
      setToken(resetToken);
      // Clean query string from browser history so token doesn't leak or linger
      window.history.replaceState(null, "", window.location.pathname);
      setIsValidatingToken(true);
      fetch(`${API_BASE}/api/auth/password/reset/validate?token=${encodeURIComponent(resetToken)}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.valid) {
            setToken("");
            setMessage({
              type: "error",
              text: data?.message || "This password reset link is invalid or has expired. Please request a new one.",
            });
          }
        })
        .catch(() => {
          // Network glitch: keep token so user can still attempt form submission
        })
        .finally(() => {
          setIsValidatingToken(false);
        });
    }
  }, []);

  const requestResetLink = async (event) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/password/reset/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to request a password reset link.");
      setMessage({
        type: "success",
        text: data?.message || "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (form.newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    if (form.newPassword.length > 72) {
      setMessage({ type: "error", text: "Password cannot exceed 72 characters." });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/password/reset/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(data?.message || "This password reset link is invalid or expired.");
        error.code = data?.code;
        throw error;
      }
      setComplete(true);
      setToken("");
      setMessage({
        type: "success",
        text: data?.message || "Password reset successful! You can now sign in with your new password.",
      });
    } catch (error) {
      if (error.code === "PASSWORD_RESET_INVALID") setToken("");
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/10";

  return (
    <>
      {/* Explicit no-referrer meta tag to ensure token does not leak */}
      <meta name="referrer" content="no-referrer" />
      <main className="flex min-h-screen items-center justify-center bg-[#FBF7F8] px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-[#eee6ee] bg-white p-7 shadow-sm sm:p-9">
          <Link href="/" className="font-serif text-lg font-semibold text-[#9B4F5E]">
            RupKotha
          </Link>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            {complete
              ? "Password reset complete"
              : isValidatingToken
              ? "Verifying link..."
              : token
              ? "Create new password"
              : "Reset your password"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {complete
              ? "Your password has been updated securely. All previous active sessions have been signed out."
              : isValidatingToken
              ? "Please wait while we verify your one-time reset link."
              : token
              ? "Choose a strong password with at least 8 characters for your account."
              : "Enter your account's email address and we will send you a one-time link to choose a new password."}
          </p>

          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`mt-5 rounded-xl border p-3 text-sm leading-relaxed ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {isValidatingToken && (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
              <p className="mt-4 text-xs font-medium text-gray-500">Validating one-time token...</p>
            </div>
          )}

          {!isValidatingToken && !complete && token && (
            <form onSubmit={handleResetPassword} className="mt-6 grid gap-4">
              <div className="grid gap-2 text-sm font-medium text-gray-700">
                <label htmlFor="newPassword">New password</label>
                <div className="relative">
                  <input
                    id="newPassword"
                    className={fieldClass}
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    placeholder="At least 8 characters"
                    value={form.newPassword}
                    onChange={(event) =>
                      setForm({ ...form, newPassword: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <FaRegEye className="h-4 w-4" />
                    ) : (
                      <FaRegEyeSlash className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-2 text-sm font-medium text-gray-700">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    className={fieldClass}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm({ ...form, confirmPassword: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <FaRegEye className="h-4 w-4" />
                    ) : (
                      <FaRegEyeSlash className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                className="mt-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#843F4E] active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? "Updating password..." : "Set new password"}
              </button>
            </form>
          )}

          {!isValidatingToken && !complete && !token && (
            <form onSubmit={requestResetLink} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-gray-700">
                Email address
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                disabled={isSubmitting}
                className="mt-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#843F4E] active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          )}

          {complete && (
            <div className="mt-6">
              <Link
                href="/auth/login"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#843F4E]"
              >
                Continue to sign in
              </Link>
            </div>
          )}

          {!isValidatingToken && !complete && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{" "}
              <Link href="/auth/login" className="font-semibold text-[#9B4F5E] hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </section>
      </main>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CiUser, CiLock, CiMail } from "react-icons/ci";
import { FaRegEye, FaRegEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ─── Helpers ───

/** Returns true if the value looks like an email address. */
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Returns true if the value looks like a phone number (7–15 digits, optional leading +). */
const isPhone = (v) => /^\+?[0-9\s\-]{7,15}$/.test(v.trim());

/**
 * Validates and sanitizes a redirect URL string:
 * - Only relative paths starting with / (and NOT // or /\) to prevent open-redirect attacks.
 * - Rejects any /auth/* destination to prevent redirect loops.
 */
function sanitizeRedirectPath(path) {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.pathname.startsWith("/auth")) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

// ─── Login Page ───
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverErrorCode, setServerErrorCode] = useState("");
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(null);
  const [passwordChangedNotice] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("passwordChanged") === "1";
    }
    return false;
  });

  const openForgotPassword = () => {
    setServerError("");
    setServerErrorCode("");
    setForgotMessage(null);
    setForgotEmailError("");
    if (form.identifier && form.identifier.includes("@")) {
      setForgotEmail(form.identifier.trim());
    }
    setIsForgotPasswordView(true);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotEmailError("");

    const trimmed = (forgotEmail || "").trim();
    if (!trimmed) {
      setForgotEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setForgotEmailError("Please enter a valid email address.");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/auth/password/reset/request`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to request password reset.");
      }
      setForgotMessage({
        type: "success",
        text: data?.message || "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
      });
    } catch (err) {
      setForgotMessage({
        type: "error",
        text: err.message || "Failed to request password reset. Please try again later.",
      });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const [oauthError, setOauthError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("error") || "";
      const messages = {
        ACCOUNT_LINK_REQUIRED: "An account already uses this email. Sign in to that account, then link Google in Security settings.",
        OAUTH_CANCELLED: "Google sign-in was cancelled.",
        OAUTH_PROVIDER_UNAVAILABLE: "Google sign-in is temporarily unavailable.",
      };
      return messages[code] || (code ? "Google sign-in could not be completed. Please try again." : "");
    }
    return "";
  });

  // Strip invalid or circular /auth redirect parameters from the address bar on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && !sanitizeRedirectPath(redirect)) {
        params.delete("redirect");
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash}`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, []);

  const handleOAuthSignIn = (provider = "google") => {
    setOauthError("");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const targetUrl = new URL(`/api/auth/oauth/${provider}`, apiUrl || window.location.origin);
    const safeRedirect = sanitizeRedirectPath(new URLSearchParams(window.location.search).get("redirect"));
    if (safeRedirect) targetUrl.searchParams.set("redirect", safeRedirect);
    window.location.assign(targetUrl.toString());
  };

  // ── Validation ──
  const validate = (fields = form) => {
    const newErrors = {};

    // identifier — required, must be a valid email or phone
    if (!fields.identifier.trim()) {
      newErrors.identifier = "Email or phone number is required.";
    } else if (!isEmail(fields.identifier) && !isPhone(fields.identifier)) {
      newErrors.identifier = "Enter a valid email address or phone number.";
    }

    // password — required, min 8 chars
    if (!fields.password) {
      newErrors.password = "Password is required.";
    } else if (fields.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    return newErrors;
  };

  // ── Field change — clear error on input ──
  const handleChange = (field) => (e) => {
    const updated = { ...form, [field]: e.target.value };
    setForm(updated);
    setServerError("");
    setServerErrorCode("");

    // Re-validate this field live once the user has already blurred it
    if (touched[field]) {
      const newErrors = validate(updated);
      setErrors((prev) => ({
        ...prev,
        [field]: newErrors[field],
      }));
    }
  };

  // ── Blur — mark field as touched and validate it ──
  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = validate();
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setServerErrorCode("");
    setTouched({ identifier: true, password: true });

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        identifier: form.identifier,
        password: form.password,
        rememberMe: rememberMe,
      });

      const rawRedirect = new URLSearchParams(window.location.search).get("redirect");
      const safeRedirect = sanitizeRedirectPath(rawRedirect);

      // Keep admins on their dashboard; customers return to the requested safe relative path or home
      if (res?.user?.role === "ADMIN") {
        router.push(safeRedirect && safeRedirect.startsWith("/admin") ? safeRedirect : "/admin");
      } else {
        router.push(safeRedirect && !safeRedirect.startsWith("/admin") ? safeRedirect : "/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setServerErrorCode(err.code || "");
      setServerError(
        err.code === "PASSWORD_NOT_SET"
          ? "Invalid email or password."
          : err.message || "Failed to log in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Field border ring helper ──
  const fieldClass = (field) =>
    `flex items-center gap-3 rounded-full bg-white/60 border px-4 h-12 transition-all focus-within:ring-2 ${
      errors[field] && touched[field]
        ? "border-red-400 focus-within:ring-red-300/50"
        : "border-white/60 focus-within:ring-[#C47B8A]/40"
    }`;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-start pt-12 px-4">
      {/* ── Full-screen background image ── */}
      <Image
        src="/images/background_image/Login And register Background.jpg"
        alt="Background"
        fill
        priority
        className="object-fill object-center"
        sizes="100vw"
      />

      {/* ── Soft pink overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-200/40 via-pink-100/20 to-purple-100/30" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Glass card */}
        <div className="w-full rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl">
          {isForgotPasswordView ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordView(false);
                  setForgotMessage(null);
                }}
                className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-[#9B4F5E] mb-4 transition-colors font-medium"
              >
                <FaArrowLeft className="h-3 w-3" />
                Back to Sign In
              </button>
              <h1
                className="text-center text-2xl font-semibold text-gray-800 mb-1"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Reset Password
              </h1>
              <p className="text-center text-xs text-gray-600 mb-6 leading-relaxed">
                Enter your verified account email address, and we&apos;ll send you a password reset link.
              </p>

              {forgotMessage && (
                <div
                  role={forgotMessage.type === "error" ? "alert" : "status"}
                  className={`mb-4 rounded-lg border p-3 text-center text-xs leading-relaxed ${
                    forgotMessage.type === "error"
                      ? "border-red-200 bg-red-50/90 text-red-600"
                      : "border-emerald-200 bg-emerald-50/90 text-emerald-700"
                  }`}
                >
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1">
                  <div
                    className={`flex items-center gap-3 rounded-full bg-white/60 border px-4 h-12 transition-all focus-within:ring-2 ${
                      forgotEmailError
                        ? "border-red-400 focus-within:ring-red-300/50"
                        : "border-white/60 focus-within:ring-[#C47B8A]/40"
                    }`}
                  >
                    <span className="text-gray-400 shrink-0">
                      <CiMail className="h-5 w-5 text-black" />
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotEmailError) setForgotEmailError("");
                      }}
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {forgotEmailError && (
                    <p className="text-xs text-red-500 pl-4" role="alert">
                      {forgotEmailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="mt-1 w-full h-12 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isForgotSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordView(false);
                    setForgotMessage(null);
                  }}
                  className="text-xs text-gray-600 hover:text-[#9B4F5E] hover:underline"
                >
                  Return to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Card header */}
              <h1
                className="text-center text-2xl font-semibold text-gray-800 mb-1"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Welcome Back
              </h1>
              <p className="text-center text-sm text-gray-500 mb-6">
                Sign in to your account
              </p>

              {/* Password Changed Success Alert */}
              {passwordChangedNotice && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/95 p-3 text-center text-xs font-medium text-emerald-700 leading-relaxed"
                >
                  Your password was changed. Please sign in with your new password.
                </div>
              )}

              {/* Server Error Alert */}
              {serverError && (
                <div
                  role={serverErrorCode === "PASSWORD_NOT_SET" ? "status" : "alert"}
                  className={`mb-4 rounded-lg border p-3 text-center text-xs ${
                    serverErrorCode === "PASSWORD_NOT_SET"
                      ? "border-amber-300 bg-amber-50/95 text-amber-900"
                      : "border-red-200 bg-red-50/90 text-red-600"
                  }`}
                >
                  {serverError}
                  {serverErrorCode === "PASSWORD_NOT_SET" && (
                    <p className="mt-2">
                      If you registered with Google, sign in with Google below. You can set a password later in My Profile → Security.
                    </p>
                  )}
                  {serverErrorCode === "EMAIL_NOT_VERIFIED" && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <Link
                        href={`/auth/verify-email${form.identifier?.includes("@") ? `?email=${encodeURIComponent(form.identifier.trim())}` : ""}`}
                        className="font-semibold underline hover:text-red-800"
                      >
                        Resend verification email
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Email / Phone field */}
                <div className="flex flex-col gap-1">
                  <div className={fieldClass("identifier")}>
                    <span className="text-gray-400 shrink-0">
                      <CiUser className="h-5 w-5 text-black" />
                    </span>
                    <input
                      type="text"
                      placeholder="Email or Phone Number"
                      value={form.identifier}
                      onChange={handleChange("identifier")}
                      onBlur={handleBlur("identifier")}
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                      autoComplete="email"
                      aria-invalid={!!(errors.identifier && touched.identifier)}
                      aria-describedby={
                        errors.identifier && touched.identifier
                          ? "identifier-error"
                          : undefined
                      }
                    />
                  </div>
                  {errors.identifier && touched.identifier && (
                    <p
                      id="identifier-error"
                      className="text-xs text-red-500 pl-4"
                      role="alert"
                    >
                      {errors.identifier}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1">
                  <div className={fieldClass("password")}>
                    <span className="text-gray-400 shrink-0">
                      <CiLock className="h-5 w-5 text-black" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange("password")}
                      onBlur={handleBlur("password")}
                      className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                      autoComplete="current-password"
                      aria-invalid={!!(errors.password && touched.password)}
                      aria-describedby={
                        errors.password && touched.password
                          ? "password-error"
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <FaRegEye className="h-5 w-5" />
                      ) : (
                        <FaRegEyeSlash className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p
                      id="password-error"
                      className="text-xs text-red-500 pl-4"
                      role="alert"
                    >
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember me & Forgot Password */}
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-[#9B4F5E]"
                    />
                    <span className="text-xs sm:text-sm text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs text-[#9B4F5E] hover:text-[#843f4e] hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 w-full h-12 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300/60" />
                <span className="text-xs text-gray-500">Or continue with</span>
                <div className="flex-1 h-px bg-gray-300/60" />
              </div>

              {/* OAuth Error Notification */}
              {oauthError && (
                <div className="mb-4 text-xs text-red-600 bg-red-50/90 border border-red-200 rounded-lg p-2.5 text-center">
                  {oauthError}
                </div>
              )}

              {/* Google sign-in */}
              <button
                type="button"
                onClick={() => handleOAuthSignIn("google")}
                className="w-full h-12 rounded-full bg-white/80 border border-white/60 flex items-center justify-center gap-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95"
              >
                <GoogleIcon />
                Google
              </button>

              {/* Register link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-[#9B4F5E] font-medium hover:underline"
                >
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

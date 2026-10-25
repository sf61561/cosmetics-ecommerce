"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CiUser,CiLock } from "react-icons/ci";
import { FaRegEye,FaRegEyeSlash } from "react-icons/fa";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Login Page ───

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: hook up authentication
    console.log("Login:", form);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-start pt-12 px-4">

      {/* ── Full-screen background image ── */}
      {/* priority already sets loading="eager" internally — do not set loading prop alongside priority */}
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email field */}
            <div className="flex items-center gap-3 rounded-full bg-white/60 border border-white/60 px-4 h-12 focus-within:ring-2 focus-within:ring-[#C47B8A]/40">
              <span className="text-gray-400 shrink-0">
                <CiUser className="h-5 w-5 text-black" />
              </span>
              <input
                type="text"
                placeholder="Email or Phone Number"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                autoComplete="email"
              />
            </div>

            {/* Password field */}
            <div className="flex items-center gap-3 rounded-full bg-white/60 border border-white/60 px-4 h-12 focus-within:ring-2 focus-within:ring-[#C47B8A]/40">
              <span className="text-gray-400 shrink-0">
                <CiLock className="h-5 w-5 text-black" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaRegEye className="h-5 w-5" /> : <FaRegEyeSlash className="h-5 w-5" />}
              </button>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#9B4F5E]"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#9B4F5E] hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              className="mt-1 w-full h-12 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300/60" />
            <span className="text-xs text-gray-500">Or continue with</span>
            <div className="flex-1 h-px bg-gray-300/60" />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
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
        </div>
      </div>
    </div>
  );
}

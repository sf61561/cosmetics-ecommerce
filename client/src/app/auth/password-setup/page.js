"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/services/apiConfig";

export default function PasswordSetupPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupToken = params.get("token") || "";
    setToken(setupToken);
    setEmail(window.sessionStorage.getItem("passwordSetupEmail") || "");
    window.sessionStorage.removeItem("passwordSetupEmail");
    if (setupToken) {
      // Keep the one-time bearer token out of browser history after loading it into memory.
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const requestLink = async (event) => {
    event.preventDefault();
    setMessage(null);
    const trimmed = (email || "").trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    if (/^www\./i.test(trimmed)) {
      setMessage({
        type: "error",
        text: "Email address cannot start with 'www.'. Please remove 'www.' from the beginning.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/password/setup/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to request a password setup link.");
      setMessage({ type: "success", text: data?.message || "If the account is eligible, a password setup link has been sent to its verified email." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPassword = async (event) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/password/setup/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(data?.message || "This setup link is invalid or expired.");
        error.code = data?.code;
        throw error;
      }
      setComplete(true);
      setToken("");
      setMessage({ type: "success", text: data?.message || "Your password is ready. Sign in with your email and password." });
    } catch (error) {
      if (error.code === "PASSWORD_SETUP_INVALID") setToken("");
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/10";

  return <main className="flex min-h-screen items-center justify-center bg-[#FBF7F8] px-4 py-10">
    <section className="w-full max-w-md rounded-3xl border border-[#eee6ee] bg-white p-7 shadow-sm sm:p-9">
      <div className="flex items-center justify-center mb-6">
        <Link
          href="/"
          className="flex flex-col items-center group select-none"
          aria-label="Elourá Home"
        >
          <span className="font-logo text-2xl font-semibold tracking-[0.24em] text-gray-900 group-hover:text-[#9B4F5E] transition-colors pl-[0.24em]">
            ELOURÁ
          </span>
          <div className="w-12 h-px bg-gray-300 mt-1.5 mb-1" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-gray-400 font-medium pl-[0.25em]">
            Korean Skincare
          </span>
        </Link>
      </div>
      <h1 className="mt-5 text-2xl font-bold text-gray-900">{complete ? "Password set" : token ? "Set your password" : "Get a password setup link"}</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">{token ? "Choose a password for your existing account. Your linked provider will continue to work." : "For accounts without a password, enter the verified email on your account. If eligible, we’ll send a one-time link."}</p>

      {message && <div role={message.type === "error" ? "alert" : "status"} className={`mt-5 rounded-xl border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}

      {!complete && token && <form onSubmit={setPassword} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-gray-700">New password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></label>
        <label className="grid gap-2 text-sm font-medium text-gray-700">Confirm password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
        <button disabled={isSubmitting} className="mt-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:opacity-60">{isSubmitting ? "Saving…" : "Set password"}</button>
      </form>}

      {!complete && !token && <form onSubmit={requestLink} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-gray-700">Email address<input className={fieldClass} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button disabled={isSubmitting} className="mt-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:opacity-60">{isSubmitting ? "Sending…" : "Send setup link"}</button>
      </form>}

      {complete && <Link href="/auth/login" className="mt-6 inline-flex rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#843F4E]">Continue to sign in</Link>}
      {!complete && <p className="mt-6 text-center text-sm text-gray-500"><Link href="/auth/login" className="font-semibold text-[#9B4F5E] hover:underline">Back to sign in</Link></p>}
    </section>
  </main>;
}

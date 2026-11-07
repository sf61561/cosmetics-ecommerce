"use client";

import { useCallback, useEffect, useState } from "react";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { customerAccountService } from "@/services/customerAccountService";

function StatusMessage({ message }) {
  if (!message) return null;
  const error = message.type === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mt-5 rounded-xl border p-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message.text}
    </div>
  );
}

export default function SecurityPage() {
  const [security, setSecurity] = useState(null);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSecurity = useCallback(async () => {
    setIsLoading(true);
    try {
      setSecurity(await customerAccountService.security());
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const savePassword = async (event) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);
    try {
      const payload = hasPassword
        ? form
        : { newPassword: form.newPassword, confirmPassword: form.confirmPassword };
      const result = await customerAccountService.updatePassword(payload);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      if (result?.requiresLogin) {
        setMessage({ type: "success", text: "Password saved. Please sign in again." });
        window.setTimeout(() => {
          window.location.href = "/auth/login?passwordChanged=1";
        }, 700);
      } else {
        setMessage({ type: "success", text: "Password updated successfully." });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasPassword = Boolean(security?.hasPassword);

  return (
    <ProfileLayout title="Security & sign-in" description="Manage the ways you can access your Elourá account.">
      <div className="grid gap-6">
        <section className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">Password</h2>
          <p className="mt-2 text-sm text-gray-500">
            {hasPassword
              ? "Your account can sign in with an email or phone number and password."
              : "Add a password here to sign in with your email or phone."}
          </p>
          <StatusMessage message={message} />
          {isLoading ? (
            <p className="mt-6 text-sm text-gray-500">Loading security settings…</p>
          ) : (
            <form onSubmit={savePassword} className="mt-6 grid gap-5">
              {[
                ...(hasPassword ? [["currentPassword", "Current password"]] : []),
                ["newPassword", "New password"],
                ["confirmPassword", "Confirm new password"],
              ].map(([field, label]) => (
                <label key={field} className="grid gap-2 text-sm font-medium text-gray-700">
                  {label}
                  <input
                    required
                    minLength={field === "currentPassword" ? 1 : 8}
                    maxLength={72}
                    autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                    type="password"
                    value={form[field]}
                    onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                    className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#9B4F5E]"
                  />
                </label>
              ))}
              <div>
                <button
                  disabled={isSaving}
                  className="rounded-full bg-[#9B4F5E] px-6 py-3 font-semibold text-white hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </ProfileLayout>
  );
}

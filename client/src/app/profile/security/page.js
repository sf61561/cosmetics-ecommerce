"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { useAuth } from "@/context/AuthContext";
import { customerAccountService } from "@/services/customerAccountService";

function StatusMessage({ message }) {
  if (!message) return null;
  const error = message.type === "error";
  return <div role={error ? "alert" : "status"} className={`mt-5 rounded-xl border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>;
}

export default function SecurityPage() {
  const { setAuthSession } = useAuth();
  const router = useRouter();
  const [security, setSecurity] = useState(null);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyProvider, setBusyProvider] = useState("");

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
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("providerLinked");
    const linkError = params.get("providerLinkError");
    if (linked) setMessage({ type: "success", text: `${linked[0].toUpperCase()}${linked.slice(1)} is now linked to your account.` });
    if (linkError) {
      const messageByCode = {
        ACCOUNT_LINK_REQUIRED: "This provider belongs to another RupKotha account. Sign in to that account to link it.",
        PROVIDER_ALREADY_LINKED: "This provider is already linked to your account.",
        RECENT_AUTH_REQUIRED: "Sign in again, then retry linking the provider.",
        OAUTH_CANCELLED: "Provider linking was cancelled.",
      };
      setMessage({ type: "error", text: messageByCode[linkError] || "Provider linking could not be completed. Please try again." });
    }
    if (linked || linkError) window.history.replaceState(null, "", window.location.pathname);
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
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.code === "RECENT_AUTH_REQUIRED"
          ? "Sign in with Google again, then return here to set your password."
          : error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const beginLink = async (provider) => {
    setMessage(null);
    setBusyProvider(provider);
    try {
      const authorizationUrl = await customerAccountService.startProviderLink(provider);
      const destination = new URL(authorizationUrl);
      if (destination.protocol !== "https:") throw new Error("The provider authorization URL is invalid.");
      window.location.assign(destination.toString());
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setBusyProvider("");
    }
  };

  const unlink = async (provider) => {
    if (!window.confirm(`Unlink ${provider} from your RupKotha account?`)) return;
    setMessage(null);
    setBusyProvider(provider);
    try {
      await customerAccountService.unlinkProvider(provider);
      await loadSecurity();
      setMessage({ type: "success", text: `${provider[0].toUpperCase()}${provider.slice(1)} was unlinked.` });
    } catch (error) {
      const text = error.code === "LAST_AUTH_METHOD"
        ? "Add a password or another sign-in provider before unlinking this one."
        : error.code === "RECENT_AUTH_REQUIRED"
          ? "Sign in again before changing your linked sign-in methods."
          : error.message;
      setMessage({ type: "error", text });
    } finally {
      setBusyProvider("");
    }
  };

  const providers = security?.providers || [];
  const supportedProviders = security?.supportedProviders || [];
  const visibleProviders = supportedProviders.filter((item) =>
    item.isConfigured || providers.some((provider) => provider.provider === item.name)
  );
  const hasPassword = Boolean(security?.hasPassword);

  return <ProfileLayout title="Security & sign-in" description="Manage the ways you can access your RupKotha account.">
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-gray-900">Password</h2>
        <p className="mt-2 text-sm text-gray-500">
          {hasPassword ? "Your account can sign in with an email or phone number and password." : "You signed in with a linked provider. Add a password here to also sign in with your email or phone."}
        </p>
        <StatusMessage message={message} />
        {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading security settings…</p> : (
          <form onSubmit={savePassword} className="mt-6 grid gap-5">
            {[
              ...(hasPassword ? [["currentPassword", "Current password"]] : []),
              ["newPassword", "New password"],
              ["confirmPassword", "Confirm new password"],
            ].map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium text-gray-700">
              {label}
              <input required minLength={field === "currentPassword" ? 1 : 8} maxLength={72} autoComplete={field === "currentPassword" ? "current-password" : "new-password"} type="password" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#9B4F5E]" />
            </label>)}
            <div><button disabled={isSaving} className="rounded-full bg-[#9B4F5E] px-6 py-3 font-semibold text-white hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : hasPassword ? "Update password" : "Set password"}</button></div>
          </form>
        )}
      </section>

      {visibleProviders.length > 0 && <section className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold text-gray-900">Linked providers</h2><p className="mt-2 text-sm text-gray-500">Link a provider explicitly while signed in. Provider email addresses never link accounts automatically.</p></div>
        </div>
        {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading linked providers…</p> : <div className="mt-5 divide-y divide-gray-100">
          {visibleProviders.map((item) => {
            const linked = providers.some((provider) => provider.provider === item.name);
            return <div key={item.name} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div><p className="font-semibold capitalize text-gray-800">{item.name}</p><p className="mt-1 text-xs text-gray-500">{linked ? "Connected to this account" : item.isConfigured ? "Not connected" : "Unavailable until configured"}</p></div>
              {linked ? <button type="button" disabled={busyProvider === item.name || (!hasPassword && providers.length <= 1)} onClick={() => unlink(item.name)} title={!hasPassword && providers.length <= 1 ? "Add another sign-in method before unlinking this provider." : undefined} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50">{busyProvider === item.name ? "Working…" : "Unlink"}</button> : <button type="button" disabled={!item.isConfigured || Boolean(busyProvider)} onClick={() => beginLink(item.name)} className="rounded-full border border-[#9B4F5E] px-4 py-2 text-sm font-semibold text-[#9B4F5E] hover:bg-[#FBF0F0] disabled:cursor-not-allowed disabled:opacity-50">{busyProvider === item.name ? "Opening…" : `Link ${item.name}`}</button>}
            </div>;
          })}
        </div>}
        <p className="mt-5 text-xs leading-5 text-gray-500">For security, provider changes require a recent sign-in. Keep at least one sign-in method connected.</p>
      </section>}
    </div>
  </ProfileLayout>;
}

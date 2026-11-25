"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import superadminService from "@/services/superadminService";
import { IoCheckmarkCircle, IoAlertCircle, IoLockClosedOutline, IoPersonOutline, IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError("No invitation token provided. Please click the link received in your email.");
      setVerifying(false);
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const data = await superadminService.verifyAdminInvite(token);
        setInviteData(data);
        if (data.name) setName(data.name);
      } catch (err) {
        setVerifyError(err.message || "This invitation link is invalid or has expired.");
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!name.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }

    if (!password || password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await superadminService.acceptAdminInvite({
        token,
        name: name.trim(),
        password,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/auth/login?setup=success");
      }, 2000);
    } catch (err) {
      setSubmitError(err.message || "Failed to activate account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent mx-auto" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Verifying administrator invitation...</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-4">
          <IoAlertCircle className="h-14 w-14 text-rose-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Invitation Expired or Invalid
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {verifyError}
          </p>
          <div className="pt-2">
            <Link
              href="/auth/login"
              className="inline-flex rounded-full bg-gray-900 dark:bg-gray-100 px-6 py-2.5 text-xs font-semibold text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-xl border border-gray-100 dark:border-gray-800 text-center space-y-4">
          <IoCheckmarkCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Account Activated!
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Your administrator account is now active. Redirecting you to the sign-in page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 px-3 py-1 text-xs font-medium text-[#8B5CF6]">
            Administrator Invitation
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome to Eloura
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You were invited as an administrator ({inviteData?.email}). Please set up your name and credentials below.
          </p>
        </div>

        {submitError && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-10"
                required
              />
              <IoPersonOutline className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-10 pr-10"
                required
              />
              <IoLockClosedOutline className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <IoEyeOffOutline className="h-4 w-4" /> : <IoEyeOutline className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pl-10"
                required
              />
              <IoLockClosedOutline className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] py-3 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer mt-2"
          >
            {submitting ? "Activating Account..." : "Complete Setup & Activate"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        </div>
      }
    >
      <AdminSetupContent />
    </Suspense>
  );
}

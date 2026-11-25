"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import superadminService from "@/services/superadminService";
import { IoClose, IoKeyOutline, IoMailOutline, IoEyeOutline, IoEyeOffOutline, IoCheckmarkCircle } from "react-icons/io5";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleRequestCode = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await superadminService.requestPasswordChangeCode();
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await superadminService.confirmPasswordChange({
        code: code.trim(),
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        logout();
      }, 2500);
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#8B5CF6]">
              <IoKeyOutline className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Change Password
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Email OTP verified password change
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {success ? (
            <div className="py-8 text-center space-y-3">
              <IoCheckmarkCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Password Changed Successfully!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Your credentials have been securely updated. You will now be redirected to sign in with your new password.
              </p>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <IoMailOutline className="h-4 w-4 text-[#8B5CF6]" />
                  <span>Security Verification Required</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  To protect your account, we will send a 6-digit one-time verification code to your registered email address:
                </p>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {user?.email}
                </p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                The code expires in 15 minutes and can only be used once.
              </p>
            </div>
          ) : (
            <form id="password-change-form" onSubmit={handleConfirmPasswordChange} className="space-y-4">
              {/* OTP Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleRequestCode}
                    className="text-[11px] text-[#8B5CF6] hover:underline disabled:text-gray-400 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full tracking-widest text-center text-lg font-mono rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden"
                  required
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showCurrent ? <IoEyeOffOutline className="h-4 w-4" /> : <IoEyeOutline className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showNew ? <IoEyeOffOutline className="h-4 w-4" /> : <IoEyeOutline className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-hidden"
                  required
                />
              </div>
            </form>
          )}
        </div>

        {/* Pinned Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            {step === 1 ? (
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            ) : (
              <button
                type="submit"
                form="password-change-form"
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A46377] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Update Password"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

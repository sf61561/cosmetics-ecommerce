"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CiUser, CiLock, CiPhone, CiCamera, CiMail } from "react-icons/ci";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

// ─── Google Icon ───
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

// ─── Input Field Component ───
function InputField({ icon, type = "text", placeholder, value, onChange, autoComplete, rightElement }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white/60 border border-white/60 px-4 h-12 focus-within:ring-2 focus-within:ring-[#C47B8A]/40 transition-all">
      <span className="text-gray-400 shrink-0 text-xl">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
        required
      />
      {rightElement && <span className="shrink-0">{rightElement}</span>}
    </div>
  );
}

// ─── Avatar Upload Component ───
function AvatarUpload({ preview, onFileChange, onRemove, error, isUploading }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    onFileChange(e);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-1.5 mb-2">
      {/* Clickable avatar circle */}
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/70 shadow-md bg-white/50 group focus:outline-none focus:ring-2 focus:ring-[#C47B8A]/50 transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none"
          aria-label="Upload profile picture"
        >
          {preview ? (
            // Show selected image preview
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
          ) : (
            // Placeholder silhouette
            <div className="w-full h-full flex flex-col items-center justify-center bg-pink-100/60">
              <CiUser className="text-[#9B4F5E]/70 text-3xl" />
            </div>
          )}

          {/* Hover / Uploading overlay */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 transition-opacity ${
              isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isUploading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CiCamera className="text-white text-2xl" />
            )}
          </div>
        </button>

        {/* Small camera badge icon on bottom right */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 bg-[#9B4F5E] text-white p-1 rounded-full shadow hover:bg-[#843f4e] transition-colors"
          aria-label="Choose photo"
        >
          <CiCamera className="text-xs" />
        </button>
      </div>

      {/* Label & Remove button */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {preview ? "Photo selected" : "Add profile photo (optional)"}
        </span>
        {preview && !isUploading && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700 underline transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Profile picture file input"
      />

      {/* Validation error */}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}

// ─── Register Page ───
export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Profile picture state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    authProvider: "local",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error") || "";
    }
    return "";
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [isSuccessVerify, setIsSuccessVerify] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const router = useRouter();

  // ── Unified OAuth initiation handler ──
  const handleOAuthSignIn = (provider = "google") => {
    setServerError("");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const targetUrl = apiUrl
      ? `${apiUrl}/api/auth/oauth/${provider}`
      : `${window.location.origin}/api/auth/oauth/${provider}`;
    window.location.assign(targetUrl);
  };

  // ── Avatar file change handler ──
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Only image files (JPEG, PNG, WebP, GIF) are allowed.",
      }));
      return;
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Image must be smaller than 5 MB.",
      }));
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (errors.avatar) setErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  // ── Remove Avatar handler ──
  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (errors.avatar) setErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  // ── Validation ──
  const validate = () => {
    const newErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\+?[0-9\s\-]{7,15}$/.test(form.phone.trim())) {
      newErrors.phone = "Enter a valid phone number.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    }
    else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/.test(form.password)){
      newErrors.password="Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (e.g., @, #, or !)."
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the Terms of Service and Privacy Policy.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setServerError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      // Connect to Express backend registration endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`
        : "/api/auth/register";

      let response;

      if (avatarFile) {
        // If an image is selected, send as multipart/form-data in a single request
        const formData = new FormData();
        formData.append("fullName", form.fullName);
        formData.append("phone", form.phone);
        if (form.email) formData.append("email", form.email);
        formData.append("password", form.password);
        formData.append("confirmPassword", form.confirmPassword);
        formData.append("agreedToTerms", String(agreedToTerms));
        formData.append("authProvider", form.authProvider || "local");
        formData.append("image", avatarFile);

        response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        });
      } else {
        // If no image is selected, send as clean JSON
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: form.fullName,
            phone: form.phone,
            email: form.email || null,
            password: form.password,
            confirmPassword: form.confirmPassword,
            agreedToTerms,
            authProvider: form.authProvider || "local",
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else {
          setServerError(data.message || "Registration failed. Please check your information.");
        }
        return;
      }

      if (data.emailVerificationRequired || data.user?.emailVerificationRequired || form.email) {
        setSubmittedEmail(form.email ? form.email.trim() : "");
        setIsSuccessVerify(true);
      } else {
        setSuccessMessage("Account created successfully! Redirecting to sign in...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear the error for this field on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-start pt-12 px-4 pb-8">

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

        {/* Glass card */}
        <div className="w-full rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl p-8 shadow-2xl">
          {isSuccessVerify ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-pink-100 text-[#9B4F5E] flex items-center justify-center mx-auto mb-4 shadow-sm border border-pink-200">
                <CiMail className="w-8 h-8" />
              </div>
              <h2
                className="text-2xl font-semibold text-gray-800 mb-2"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Check Your Email
              </h2>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                We sent a verification link to:
              </p>
              <div className="text-sm font-semibold text-gray-800 mb-4 bg-white/60 border border-white/80 rounded-xl py-2.5 px-3 break-all">
                {submittedEmail}
              </div>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Please click the link in your email to activate your account. This link expires in 24 hours.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/login"
                  className="w-full py-3 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95"
                >
                  Continue to Sign In
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSuccessVerify(false)}
                  className="text-xs text-gray-600 hover:text-[#9B4F5E] underline transition-colors pt-2"
                >
                  Wrong email address? Change email
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
                Create Your Account
              </h1>
          <p className="text-center text-sm text-gray-500 mb-5 leading-snug">
            Join Eloura to track your orders<br />and save your favorites
          </p>

          {/* ── Profile Picture Upload ── */}
          <AvatarUpload
            preview={avatarPreview}
            onFileChange={handleAvatarChange}
            onRemove={handleRemoveAvatar}
            error={errors.avatar}
            isUploading={isSubmitting}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <InputField
                icon={<CiUser />}
                placeholder="Full Name"
                value={form.fullName}
                onChange={handleChange("fullName")}
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 pl-4">{errors.fullName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1">
              <InputField
                icon={<CiPhone />}
                type="tel"
                placeholder="Phone Number"
                value={form.phone}
                onChange={handleChange("phone")}
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-xs text-red-500 pl-4">{errors.phone}</p>
              )}
            </div>

            {/* Email (optional) */}
            <div className="flex flex-col gap-1">
              <InputField
                icon={<CiUser />}
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange("email")}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-500 pl-4">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <InputField
                icon={<CiLock />}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange("password")}
                autoComplete="new-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaRegEye className="w-4 h-4" /> : <FaRegEyeSlash className="w-4 h-4" />}
                  </button>
                }
              />
              {errors.password && (
                <p className="text-xs text-red-500 pl-4">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <InputField
                icon={<CiLock />}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                autoComplete="new-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FaRegEye className="w-4 h-4" /> : <FaRegEyeSlash className="w-4 h-4" />}
                  </button>
                }
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 pl-4">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="flex flex-col gap-1 px-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#9B4F5E] shrink-0"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#9B4F5E] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#9B4F5E] hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-red-500 pl-6">{errors.terms}</p>
              )}
            </div>

            {/* Status messages */}
            {serverError && (
              <p className="text-xs text-red-600 text-center bg-red-50/90 border border-red-200 rounded-lg p-2.5">
                {serverError}
              </p>
            )}
            {successMessage && (
              <p className="text-xs text-emerald-700 text-center bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5">
                {successMessage}
              </p>
            )}

            {/* Create Account button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full h-12 rounded-full bg-[#9B4F5E] text-white text-sm font-semibold tracking-wide shadow-md transition-all hover:bg-[#843f4e] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300/60" />
            <span className="text-xs text-gray-500">Or register with</span>
            <div className="flex-1 h-px bg-gray-300/60" />
          </div>

          {/* Google register */}
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            className="w-full h-12 rounded-full bg-white/80 border border-white/60 flex items-center justify-center gap-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 cursor-pointer"
          >
            <GoogleIcon />
            Register with Google
          </button>

              {/* Login link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-[#9B4F5E] font-medium hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

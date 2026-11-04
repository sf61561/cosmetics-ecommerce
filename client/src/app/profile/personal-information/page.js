"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { FaCamera } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { useAuth } from "@/context/AuthContext";
import { customerAccountService } from "@/services/customerAccountService";

export default function PersonalInformationPage() {
  const { user, refreshAuth } = useAuth();
  const [form, setForm] = useState(() => ({ name: user?.name || "", phone: user?.phone || "" }));
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!selectedPhoto) { setPreviewUrl(""); return undefined; }
    const url = URL.createObjectURL(selectedPhoto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPhoto]);

  const save = async (event) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);
    try {
      await customerAccountService.updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      await refreshAuth();
      setMessage({ type: "success", text: "Your personal information has been updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedPhoto) return;
    setMessage(null);
    setIsUploading(true);
    try {
      await customerAccountService.updateAvatar(selectedPhoto);
      await refreshAuth();
      setSelectedPhoto(null);
      setMessage({ type: "success", text: "Your profile photo has been updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const avatarUrl = previewUrl || user?.profilePicture || user?.profile_picture_link;
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "U";

  return <ProfileLayout title="Personal information" description="Keep your account details and profile photo up to date.">
    <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
        {avatarUrl ? <img src={avatarUrl} alt="Your profile" className="h-20 w-20 rounded-full border-2 border-[#EED9DC] object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#9B4F5E] text-3xl font-bold text-white">{initial}</div>}
        <div className="flex-1"><h2 className="font-semibold">Profile photo</h2><p className="mt-1 text-sm text-gray-500">Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FaCamera className="text-[#9B4F5E]" />Choose photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { setSelectedPhoto(event.target.files?.[0] || null); event.target.value = ""; }} /></label>{selectedPhoto && <button type="button" onClick={uploadPhoto} disabled={isUploading} className="rounded-full bg-[#9B4F5E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60">{isUploading ? "Uploading..." : "Save photo"}</button>}{selectedPhoto && <button type="button" onClick={() => setSelectedPhoto(null)} disabled={isUploading} className="rounded-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancel</button>}</div></div>
      </div>
      {message && <div role={message.type === "error" ? "alert" : "status"} className={`mt-5 rounded-xl border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}
      <form onSubmit={save} className="mt-6 grid gap-5">
        <label className="grid gap-2 text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#9B4F5E]" /></label>
        <label className="grid gap-2 text-sm font-medium">Email address<input value={user?.email || ""} readOnly className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500" /><span className="text-xs font-normal text-gray-400">Email changes require verification and are not available here.</span></label>
        <label className="grid gap-2 text-sm font-medium">Phone number<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" placeholder="01XXXXXXXXX" className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#9B4F5E]" /></label>
        <div><button disabled={isSaving} className="rounded-full bg-[#9B4F5E] px-6 py-3 font-semibold text-white hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button></div>
      </form>
    </div>
  </ProfileLayout>;
}

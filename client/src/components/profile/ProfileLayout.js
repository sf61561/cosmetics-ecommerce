"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaArrowRight, FaHeart, FaHome, FaLock, FaShoppingBag, FaSignOutAlt, FaUser, FaBell } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";

const links = [
  ["/profile", "Overview", FaUser],
  ["/profile/personal-information", "Personal information", FaUser],
  ["/orders", "My orders", FaShoppingBag],
  ["/addresses", "Saved addresses", FaHome],
  ["/profile/wishlist", "My wishlist", FaHeart],
  ["/profile/notifications", "Notifications", FaBell],
  ["/profile/security", "Security & password", FaLock],
];

export default function ProfileLayout({ title, description, children }) {
  const { user, isLoading, isLoggingOut, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if session expired naturally; skip if an explicit logout is in progress
    if (!isLoading && !user && !isLoggingOut) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname || "/profile")}`);
    }
  }, [isLoading, isLoggingOut, pathname, router, user]);

  if (isLoading || !user || isLoggingOut) {
    return (
      <div className="min-h-screen bg-[#F7F4FA]">
        <Navbar />
        <div className="flex min-h-[45vh] items-center justify-center">
          <div role="status" className="flex items-center gap-3 text-sm text-gray-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#EED9DC] border-t-[#9B4F5E]" />
            {isLoggingOut ? "Signing out..." : "Loading your account..."}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initial = user.name?.trim().charAt(0).toUpperCase() || "U";
  const avatarUrl = user.profilePicture || user.profile_picture_link;

  return <div className="min-h-screen bg-[#F7F4FA] text-[#29252A]"><Navbar /><div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-7"><p className="text-sm font-medium text-[#9B4F5E]">Your account</p><h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-gray-500">{description}</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-[#eee6ee] bg-white p-3 shadow-sm lg:sticky lg:top-6">
        <div className="flex items-center gap-3 border-b border-gray-100 px-3 pb-4 pt-2">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full border-2 border-[#EED9DC] object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9B4F5E] text-lg font-bold text-white">{initial}</div>}
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-gray-500">{user.email}</p></div>
        </div>
        <nav aria-label="Profile navigation" className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
          {links.map(([href, label, Icon]) => {
            const active = pathname === href || (href !== "/profile" && pathname?.startsWith(`${href}/`));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? "bg-[#F7E5ED] text-[#9B4F5E]" : "text-[#29252A] hover:bg-[#FBF0F0]"}`}><Icon className="shrink-0" />{label}{active && <FaArrowRight className="ml-auto text-xs" />}</Link>;
          })}
          <button type="button" onClick={logout} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"><FaSignOutAlt />Log out</button>
        </nav>
      </aside>
      <section className="min-w-0 space-y-6">{children}</section>
    </div>
  </div><Footer /></div>;
}

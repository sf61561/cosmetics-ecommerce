"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaArrowRight, FaHeart, FaHome, FaShoppingBag } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { useAuth } from "@/context/AuthContext";
import { customerAccountService } from "@/services/customerAccountService";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function ProfilePage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    setIsLoadingOverview(true);
    customerAccountService.overview()
      .then((data) => { if (active) { setOverview(data); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setIsLoadingOverview(false); });
    return () => { active = false; };
  }, [user]);

  const retryOverview = () => {
    setError("");
    setIsLoadingOverview(true);
    customerAccountService.overview()
      .then(setOverview)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoadingOverview(false));
  };
  const count = (value) => isLoadingOverview || error ? "—" : value ?? 0;

  return <ProfileLayout title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`} description="Manage your orders, delivery details, wishlist, and account settings.">
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={retryOverview} className="font-semibold underline">Try again</button></div>}
    <div className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-center">{(user?.profilePicture || user?.profile_picture_link) ? <img src={user.profilePicture || user.profile_picture_link} alt="" className="h-20 w-20 rounded-full border-2 border-[#EED9DC] object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#9B4F5E] text-3xl font-bold text-white">{user?.name?.trim().charAt(0).toUpperCase() || "U"}</div>}<div className="flex-1"><h2 className="text-xl font-bold">{user?.name}</h2><p className="mt-1 text-sm text-gray-500">{user?.email || "No email linked"} · {user?.phone || "No phone linked"}</p><p className="mt-2 text-xs text-gray-400">{user?.emailVerified ? "Email verified" : "Email verification pending"}</p></div><Link href="/profile/personal-information" className="rounded-full border border-[#9B4F5E] px-4 py-2 text-center text-sm font-semibold text-[#9B4F5E] hover:bg-[#F7E5ED]">Edit profile</Link></div></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Link href="/orders" className="rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"><FaShoppingBag className="text-[#9B4F5E]" /><p className="mt-4 text-2xl font-bold">{count(overview?.orderCount)}</p><p className="text-sm text-gray-500">All orders</p></Link>
      <Link href="/profile/wishlist" className="rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"><FaHeart className="text-[#9B4F5E]" /><p className="mt-4 text-2xl font-bold">{count(overview?.wishlistCount)}</p><p className="text-sm text-gray-500">Wishlist items</p></Link>
      <Link href="/addresses" className="rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"><FaHome className="text-[#9B4F5E]" /><p className="mt-4 text-2xl font-bold">{count(overview?.addressCount)}</p><p className="text-sm text-gray-500">Saved addresses</p></Link>
    </div>
    <div className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent orders</h2><Link href="/orders" className="flex items-center gap-2 text-sm font-semibold text-[#9B4F5E]">View all <FaArrowRight /></Link></div>{isLoadingOverview ? <div className="py-10 text-center text-sm text-gray-500">Loading your orders...</div> : error ? <div className="py-10 text-center text-sm text-gray-500">Your orders could not be loaded.</div> : overview?.recentOrders?.length ? <div className="mt-4 divide-y divide-gray-100">{overview.recentOrders.map((order) => <Link key={order.id} href={`/order-confirmation/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-[#F7F4FA]"><div><p className="text-sm font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-BD")}</p></div><span className="rounded-full bg-[#F7E5ED] px-3 py-1 text-xs font-semibold text-[#9B4F5E]">{order.orderStatus}</span><strong className="text-sm">{money(order.totalAmount)}</strong></Link>)}</div> : <div className="py-10 text-center text-sm text-gray-500">No orders yet. Your purchases will appear here.</div>}</div>
    <div className="grid gap-4 sm:grid-cols-3"><Link href="/profile/personal-information" className="rounded-2xl bg-[#F7E5ED] p-5 text-sm font-semibold hover:shadow-sm">Update personal information <FaArrowRight className="mt-3" /></Link><Link href="/addresses" className="rounded-2xl bg-white p-5 text-sm font-semibold shadow-sm hover:shadow-md">Manage saved addresses <FaArrowRight className="mt-3 text-[#9B4F5E]" /></Link><Link href="/profile/security" className="rounded-2xl bg-white p-5 text-sm font-semibold shadow-sm hover:shadow-md">Protect your account <FaArrowRight className="mt-3 text-[#9B4F5E]" /></Link></div>
  </ProfileLayout>;
}

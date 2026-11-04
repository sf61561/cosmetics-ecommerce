"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaArrowRight, FaSignInAlt } from "react-icons/fa";

export default function WishlistPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/profile/wishlist");
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF0F0]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500">
          Loading your wishlist...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF0F0]">
      <Navbar />
      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Guest sync notice */}
          <div className="mb-8 rounded-3xl border border-pink-200 bg-white p-6 shadow-xs sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900">
                Sign in to sync your wishlist
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                You have {wishlistCount} saved {wishlistCount === 1 ? "item" : "items"} on this device. Sign in to sync them to your account.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex shrink-0 gap-3">
              <Link
                href="/auth/login?redirect=/profile/wishlist"
                className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#843F4E] shadow-2xs"
              >
                <FaSignInAlt className="h-3 w-3" />
                Sign in
              </Link>
              <Link
                href="/auth/register?redirect=/profile/wishlist"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Register
              </Link>
            </div>
          </div>

          {/* Empty state or action card */}
          <div className="rounded-3xl border border-pink-100 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF0F0] text-[#9B4F5E]">
              <FaHeart className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-medium text-gray-900">
              {wishlistCount > 0 ? "Your Saved Items" : "Your Wishlist is Empty"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {wishlistCount > 0
                ? "Your guest items are safely saved on this device. Sign in to view full product details, live stock, and move them to your bag."
                : "Explore authentic Korean and Japanese skincare formulas and save your favorites to review anytime."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {wishlistCount > 0 ? (
                <Link
                  href="/auth/login?redirect=/profile/wishlist"
                  className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#843F4E] active:scale-95"
                >
                  Sign in to view items
                  <FaArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#843F4E] active:scale-95"
                >
                  Explore products
                  <FaArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


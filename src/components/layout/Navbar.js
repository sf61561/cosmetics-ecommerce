"use client";

import Link from "next/link";
import { useState } from "react";
import { FaRegUser,FaRegHeart,FaShoppingCart,FaSearch  } from "react-icons/fa";
import { IoMenu,IoClose } from "react-icons/io5";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Brands", href: "/brands" },
  { label: "New Arrivals", href: "/new-arrivals" },
];
// ─── Navbar Component ───

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loggedOutProfileClick, setLoggedoutProfileClick] = useState(false);
  const cartItemCount = 2; // TODO: replace with real cart state

  return (
    <header className="w-full">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-[#F5D5D5]" />

      {/* Main navbar */}
      <nav className="border-b border-[#F5D5D5] bg-[#F5D5D5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          {/* ── Left: Nav links (desktop) ── */}
          <ul className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Mobile: hamburger button ── */}
          <button
            suppressHydrationWarning
            type="button"
            className="lg:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <IoClose className="h-6 w-6" />
            ) : (
              <IoMenu className="h-6 w-6" />
            )}
          </button>

          {/* ── Center: Logo ── */}
          <Link href="/" className="flex items-center gap-1">
            <span className="text-2xl font-semibold tracking-wide text-gray-800 lg:text-3xl"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              RupKotha
            </span>
          </Link>

          {/* ── Right: Search + Icons ── */}
          <div className="flex items-center gap-4">
            {/* Search bar (desktop) */}
            <div className="relative hidden md:block">
              <input
                suppressHydrationWarning
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 rounded-full bg-[#FBF0F0] pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 outline-none transition-all focus:w-56 focus:ring-2 focus:ring-[#F5D5D5] lg:w-56 lg:focus:w-64"
              />
              <button
                suppressHydrationWarning
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#D4849A]"
                aria-label="Search"
              >
                <FaSearch className="h-4 w-4" />
              </button>
            </div>

            {/* Icon buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  suppressHydrationWarning
                  type="button"
                  className="relativetext-gray-600 transition-colors hover:text-gray-900"
                  aria-label="Account"
                  onClick={() => setLoggedoutProfileClick(!loggedOutProfileClick)}
                >
                  <FaRegUser className="h-5 w-5" />
                </button>
                <div className={loggedOutProfileClick ? `absolute -right-25 top-8 w-30 bg-white shadow-lg z-50` : `hidden`}>
                  <ul className="py-2">
                    <Link href="/auth/login">
                      <li><button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Login</button></li>
                    </Link>
                    <Link href="/auth/register">
                      <li><button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Register</button></li>
                    </Link>
                  </ul>
                </div>
              </div>
              <button
                suppressHydrationWarning
                type="button"
                className="text-gray-600 transition-colors hover:text-gray-900"
                aria-label="Wishlist"
              >
                <FaRegHeart className="h-5 w-5" />
              </button>

              <button
                suppressHydrationWarning
                type="button"
                className="relative text-gray-600 transition-colors hover:text-gray-900"
                aria-label="Cart"
              >
                <FaShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu drawer ── */}
        {mobileMenuOpen && (
          <div className="border-t border-[#F5D5D5] bg-white px-4 pb-4 lg:hidden">
            {/* Mobile search */}
            <div className="relative my-3">
              <input
                suppressHydrationWarning
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-full bg-[#FBF0F0] pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#F5D5D5]"
              />
              <button
                suppressHydrationWarning
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4849A]"
                aria-label="Search"
              >
                <FaSearch className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile nav links */}
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-[#FBF0F0] hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
      
    </header>
  );
}


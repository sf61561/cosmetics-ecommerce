"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { FaRegUser, FaRegHeart, FaShoppingCart, FaSearch, FaShieldAlt, FaBell, FaCheck } from "react-icons/fa";
import { IoMenu, IoClose } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNotifications } from "@/context/NotificationContext";
import HeaderSearchBox from "./HeaderSearchBox";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Brands", href: "/brands" },
  { label: "New Arrivals", href: "/new-arrivals" },
];

function formatNavTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount = 0 } = useCart();
  const { wishlistCount = 0 } = useWishlist();
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setNotificationDropdownOpen(false);
      }
    }

    if (profileDropdownOpen || notificationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen, notificationDropdownOpen]);

  // Profile image link or null
  const avatarUrl = user?.profilePicture || user?.profile_picture_link || null;
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

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
            className="lg:hidden text-gray-600 p-1"
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
            <span
              className="text-2xl font-semibold tracking-wide text-gray-800 lg:text-3xl"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              Eloura
            </span>
          </Link>

          {/* ── Right: Search + Icons ── */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search bar (desktop) */}
            <div className="hidden md:block">
              <HeaderSearchBox />
            </div>

            {/* Icon buttons */}
            <div className="flex items-center gap-3">
              {/* Mobile search toggle */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden text-gray-600 hover:text-[#9B4F5E] transition-colors p-1 cursor-pointer"
                aria-label="Open search"
              >
                <FaSearch className="h-4.5 w-4.5" />
              </button>

              {/* Profile Dropdown Container */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  suppressHydrationWarning
                  type="button"
                  className="relative flex items-center justify-center rounded-full text-gray-600 transition-colors hover:text-gray-900 focus:outline-none"
                  aria-label="Account"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                >
                  {user ? (
                    avatarUrl ? (
                      // Render customer's profile picture if present
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={user.name || "User profile"}
                        className="h-8 w-8 rounded-full object-cover border-2 border-[#D4849A] shadow-sm transition-transform hover:scale-105"
                      />
                    ) : (
                      // Fallback avatar with initial
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#9B4F5E] text-white text-xs font-semibold uppercase shadow-sm transition-transform hover:scale-105">
                        {userInitial}
                      </div>
                    )
                  ) : (
                    // Default guest user icon
                    <FaRegUser className="h-5 w-5" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-10 w-56 rounded-xl bg-white shadow-xl border border-pink-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                    {user ? (
                      // ── CUSTOMER / ADMIN LOGGED IN MENU ──
                      <>
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs font-medium text-gray-400">Signed in as</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {user.name}
                          </p>
                          {user.email && (
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          )}
                          {user.role === "ADMIN" && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                              <FaShieldAlt className="h-2.5 w-2.5" /> Admin
                            </span>
                          )}
                        </div>

                        <div className="py-1">
                          {user.role === "ADMIN" && (
                            <Link
                              href="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex w-full items-center px-4 py-2 text-sm font-medium text-[#9B4F5E] hover:bg-[#FBF0F0] transition-colors"
                            >
                              Admin Panel
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                          >
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                          >
                            My Orders
                          </Link>
                          <Link
                            href="/profile/wishlist"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                          >
                            <span>My Wishlist</span>
                            {wishlistCount > 0 && (
                              <span className="rounded-full bg-[#9B4F5E] px-2 py-0.5 text-[11px] font-bold text-white">
                                {wishlistCount}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/addresses"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                          >
                            My Addresses
                          </Link>
                        </div>

                        <div className="border-t border-gray-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              logout();
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      // ── GUEST / LOGGED OUT MENU ──
                      <div className="py-1">
                        <Link
                          href="/auth/login"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                        >
                          Login
                        </Link>
                        <Link
                          href="/auth/register"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0] transition-colors"
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Bell (for authenticated users) */}
              {user && (
                <div className="relative" ref={notificationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationDropdownOpen((prev) => !prev);
                      setProfileDropdownOpen(false);
                    }}
                    className="relative text-gray-600 transition-colors hover:text-[#9B4F5E] cursor-pointer p-0.5"
                    aria-label={`Notifications (${unreadCount} unread)`}
                  >
                    <FaBell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#9B4F5E] text-[10px] font-bold text-white shadow-2xs">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown popover */}
                  {notificationDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-88 rounded-2xl bg-white shadow-xl border border-[#F3E2E5] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#FCF8F8]">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-[#9B4F5E]">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 text-[11px] font-medium text-[#9B4F5E] hover:underline cursor-pointer"
                          >
                            <FaCheck className="h-2.5 w-2.5" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => {
                            const isUnread = !n.read_at;
                            const nData = typeof n.data === "string" ? JSON.parse(n.data) : n.data || {};
                            return (
                              <Link
                                key={n.id}
                                href={nData.link || "/profile/notifications"}
                                onClick={() => {
                                  if (isUnread) markAsRead(n.id);
                                  setNotificationDropdownOpen(false);
                                }}
                                className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
                                  isUnread ? "bg-pink-50/30" : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-semibold text-gray-900 truncate flex-1">
                                    {n.title}
                                  </h4>
                                  <span className="text-[10px] text-gray-400 shrink-0">
                                    {formatNavTime(n.created_at)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                  {n.body}
                                </p>
                              </Link>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-center">
                        <Link
                          href="/profile/notifications"
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="block text-xs font-semibold text-[#9B4F5E] hover:underline py-1"
                        >
                          View all notifications →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative text-gray-600 transition-colors hover:text-[#9B4F5E]"
                aria-label={`Wishlist (${wishlistCount} items)`}
              >
                <FaRegHeart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#9B4F5E] text-[10px] font-bold text-white shadow-2xs">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative text-gray-600 transition-colors hover:text-[#9B4F5E]"
                aria-label={`Shopping Bag (${cartCount} items)`}
              >
                <FaShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#9B4F5E] text-[10px] font-bold text-white shadow-2xs">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Mobile Expanding Search Header ── */}
        {mobileSearchOpen && (
          <div className="absolute inset-x-0 top-0 z-50 flex h-16 sm:h-20 items-center gap-2 bg-white px-4 border-b border-[#F5D5D5] md:hidden shadow-md">
            <div className="flex-1">
              <HeaderSearchBox isMobile onNavigate={() => setMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-900 cursor-pointer rounded-full hover:bg-gray-100"
              aria-label="Close search"
            >
              <IoClose className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* ── Mobile menu drawer ── */}
        {mobileMenuOpen && (
          <div className="border-t border-[#F5D5D5] bg-white px-4 pb-4 lg:hidden">
            {/* Mobile search in drawer */}
            <div className="my-3">
              <HeaderSearchBox isMobile onNavigate={() => setMobileMenuOpen(false)} />
            </div>

            {/* Mobile User Header / Section */}
            {user ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#FBF0F0] p-3 border border-[#F5D5D5]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={user.name || "User"}
                    className="h-10 w-10 rounded-full object-cover border-2 border-[#D4849A]"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-semibold">
                    {userInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Mobile nav links */}
            <ul className="flex flex-col gap-1 border-b border-gray-100 pb-3">
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

            {/* Mobile Wishlist & Cart Links */}
            <div className="py-2 border-t border-gray-100 flex flex-col gap-1">
              <Link
                href="/wishlist"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-[#FBF0F0]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <FaRegHeart className="h-4 w-4 text-[#9B4F5E]" />
                  Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#9B4F5E] text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-[#FBF0F0]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <FaShoppingCart className="h-4 w-4 text-[#9B4F5E]" />
                  Shopping Bag
                </span>
                {cartCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#9B4F5E] text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Account links */}
            <div className="mt-3 flex flex-col gap-1">
              {user ? (
                <>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-[#9B4F5E] hover:bg-pink-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/profile/notifications"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <FaBell className="h-4 w-4 text-[#9B4F5E]" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#9B4F5E] text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/addresses"
                    className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#FBF0F0]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Addresses
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="block w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link
                    href="/auth/login"
                    className="flex-1 text-center py-2 rounded-lg bg-[#9B4F5E] text-white text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex-1 text-center py-2 rounded-lg border border-[#9B4F5E] text-[#9B4F5E] text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

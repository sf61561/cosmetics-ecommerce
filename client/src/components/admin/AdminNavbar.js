"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAdminTheme } from "@/context/AdminThemeContext";
import { useNotifications } from "@/context/NotificationContext";
import { FaStore, FaSignOutAlt, FaRegUser, FaShoppingBag, FaSun, FaMoon, FaCheck } from "react-icons/fa";

// ─── 3-Petal Floral Motif for RupKotha Logo ───
function LogoFloralIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-[#A582B4] inline-block -mt-3 ml-0.5"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="6.5" rx="2.8" ry="5.8" />
      <ellipse
        cx="6.8"
        cy="10.5"
        rx="2.6"
        ry="5.2"
        transform="rotate(-38 6.8 10.5)"
      />
      <ellipse
        cx="17.2"
        cy="10.5"
        rx="2.6"
        ry="5.2"
        transform="rotate(38 17.2 10.5)"
      />
    </svg>
  );
}

// ─── Outline Notification Bell Icon ───
function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-700 dark:text-gray-300"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Down Chevron Icon ───
function ChevronDownIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-gray-700 dark:text-gray-300 transition-transform duration-150 ${
        open ? "rotate-180" : ""
      }`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function formatAdminTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminNavbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = useNotifications();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute initials (defaults to 'AD' for Admin as in mockup)
  const getInitials = () => {
    if (!user?.name) return "AD";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase() || "AD";
  };

  const initials = getInitials();
  const avatarUrl = user?.profilePicture || user?.profile_picture_link;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Left: Hamburger on mobile + Branding or Page Title ── */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-hidden cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          {/* On mobile: display RupKotha + Admin badge */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/admin" className="flex items-center">
              <span
                className="text-xl text-gray-800 dark:text-gray-100"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                RupKotha
              </span>
              <LogoFloralIcon />
            </Link>
            <span className="inline-flex items-center rounded-full bg-[#A46377] px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs select-none">
              Admin
            </span>
          </div>
        </div>

        {/* ── Right: Theme Toggle + Notification Bell + Avatar (AD) + Chevron ── */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-hidden cursor-pointer"
          >
            {isDark ? (
              <FaSun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform duration-200" />
            ) : (
              <FaMoon className="h-4 w-4 text-gray-600 hover:-rotate-12 transition-transform duration-200" />
            )}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileDropdownOpen(false);
              }}
              className="relative flex items-center justify-center p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Admin Notifications"
            >
              <BellIcon />
              {/* Pink Notification Badge */}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#D64E74] text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-88 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-xl border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 text-[11px] font-semibold text-[#D64E74] dark:text-pink-300">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#D64E74] dark:text-pink-400 hover:underline cursor-pointer"
                    >
                      <FaCheck className="h-2.5 w-2.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-gray-50 dark:divide-gray-800/80 py-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
                      No admin alerts right now
                    </li>
                  ) : (
                    notifications.slice(0, 6).map((n) => {
                      const isUnread = !n.read_at;
                      const nData = typeof n.data === "string" ? JSON.parse(n.data) : n.data || {};
                      const isOrder = n.type?.includes("order");
                      const isStock = n.type?.includes("stock");

                      return (
                        <li key={n.id}>
                          <Link
                            href={nData.link || "/admin"}
                            onClick={() => {
                              if (isUnread) markAsRead(n.id);
                              setNotificationsOpen(false);
                            }}
                            className={`py-2.5 flex items-start gap-3 rounded-lg px-2 -mx-1 transition-colors ${
                              isUnread
                                ? "bg-pink-50/50 dark:bg-pink-950/20 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                                : "hover:bg-gray-50/60 dark:hover:bg-gray-800/50"
                            }`}
                          >
                            <div
                              className={`rounded-full p-2 shrink-0 mt-0.5 ${
                                isOrder
                                  ? "bg-pink-100 dark:bg-pink-950/80 text-[#9B4F5E] dark:text-pink-300"
                                  : isStock
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300"
                                  : "bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300"
                              }`}
                            >
                              {isOrder ? (
                                <FaShoppingBag className="h-3 w-3" />
                              ) : isStock ? (
                                <FaStore className="h-3 w-3" />
                              ) : (
                                <FaRegUser className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                {n.body}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {formatAdminTime(n.created_at)}
                              </p>
                            </div>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-[#D64E74] shrink-0 mt-1" />
                            )}
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Avatar + Chevron Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Admin User Menu"
            >
              {/* Lilac circular avatar matching design */}
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={user?.name || "Admin"}
                  className="h-9 w-9 rounded-full object-cover border border-purple-100 dark:border-gray-700 shadow-xs"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DACCEF] dark:bg-purple-950/70 text-[#3B2C58] dark:text-purple-200 text-xs font-semibold tracking-wider select-none shadow-xs">
                  {initials}
                </div>
              )}

              {/* Chevron icon */}
              <ChevronDownIcon open={profileDropdownOpen} />
            </button>

            {/* Profile Menu Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl bg-white dark:bg-gray-900 py-2 shadow-xl border border-gray-100 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {user?.name || "Administrator"}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {user?.email || "admin@rupkotha.com"}
                  </p>
                  <span className="inline-block mt-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Administrator
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <FaStore className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    <span>View Storefront</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <FaRegUser className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    <span>Admin Settings</span>
                  </Link>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                  >
                    <FaSignOutAlt className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

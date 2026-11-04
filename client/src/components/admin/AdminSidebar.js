"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { IoClose } from "react-icons/io5";

// ─── 3-Petal Floral Motif for Logo ───
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

// ─── SVG Icons Matching Screenshot ───
function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CollectionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}

function BrandsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.48 12.89L17 22l-5-3-5 3 1.52-9.11" />
    </svg>
  );
}

function HeroSliderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="13" rx="2" />
      <line x1="2" y1="7" x2="22" y2="7" />
      <circle cx="5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="7.5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="10" cy="5" r="0.8" fill="currentColor" />
      <path d="M7 13l2.5-3 3 3.5" />
      <path d="M12.5 13.5l2-2.5 3.5 3.5" />
      <circle cx="9" cy="19.5" r="1" fill="currentColor" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" />
      <circle cx="15" cy="19.5" r="1" fill="currentColor" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2Z" />
      <line x1="8" y1="7.5" x2="16" y2="7.5" />
      <line x1="8" y1="11.5" x2="16" y2="11.5" />
      <line x1="8" y1="15.5" x2="13" y2="15.5" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h4" /><circle cx="18" cy="18" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ReviewsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <polygon points="12 8 13.1 10.3 15.6 10.7 13.8 12.4 14.2 14.9 12 13.7 9.8 14.9 10.2 12.4 8.4 10.7 10.9 10.3 12 8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="9" width="3.5" height="12" rx="1" />
      <rect x="16.5" y="4" width="3.5" height="17" rx="1" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Sidebar Menu Configuration ───
const navItems = [
  { label: "Dashboard", href: "/admin", icon: DashboardIcon },
  { label: "Products", href: "/admin/products", icon: ProductsIcon },
  { label: "Collections", href: "/admin/collections", icon: CollectionsIcon },
  { label: "Brands", href: "/admin/brands", icon: BrandsIcon },
  { label: "Hero Slider", href: "/admin/hero-sliders", icon: HeroSliderIcon },
  { label: "Orders", href: "/admin/orders", icon: OrdersIcon },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: AuditIcon },
  { label: "Customers", href: "/admin/customers", icon: CustomersIcon },
  { label: "Reviews", href: "/admin/reviews", icon: ReviewsIcon },
  { label: "Analytics", href: "/admin/analytics", icon: AnalyticsIcon },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
];

export default function AdminSidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLinkClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-6 overflow-y-auto transition-all duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Nav Links */}
        <div className="flex flex-col gap-6">
          {/* Header Brand */}
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center" onClick={handleLinkClick}>
                <span
                  className="text-2xl text-gray-800 dark:text-gray-100"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  RupKotha
                </span>
                <LogoFloralIcon />
              </Link>
              <span className="inline-flex items-center rounded-full bg-[#A46377] px-3.5 py-0.5 text-xs font-medium text-white shadow-xs select-none">
                Admin
              </span>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              aria-label="Close sidebar"
            >
              <IoClose className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3.5 rounded-full px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#EED9DC] text-gray-900 dark:bg-[#9B4F5E]/30 dark:text-pink-100 font-medium shadow-2xs"
                      : "text-gray-700 dark:text-gray-300 hover:bg-[#FDF6F7] dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white font-normal"
                  }`}
                >
                  <span className={isActive ? "text-gray-900 dark:text-pink-200" : "text-gray-600 dark:text-gray-400"}>
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Log Out Button */}
        <div className="pt-6 border-t border-transparent dark:border-gray-800/60">
          <button
            type="button"
            onClick={() => {
              handleLinkClick();
              logout();
            }}
            className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-[#964B59] dark:text-pink-400 hover:bg-[#FDF2F4] dark:hover:bg-gray-800/60 transition-colors text-left cursor-pointer"
          >
            <LogOutIcon />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

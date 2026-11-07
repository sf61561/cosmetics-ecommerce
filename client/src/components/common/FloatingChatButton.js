"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  IoChatbubbleEllipses,
  IoClose,
  IoLogoWhatsapp,
} from "react-icons/io5";

export default function FloatingChatButton({
  phoneNumber,
  defaultMessage,
  avatarUrl,
  requireAuth = false,
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const containerRef = useRef(null);

  // 1. Resolve WhatsApp phone number and message from props or NEXT_PUBLIC environment variables
  const resolvedPhone =
    phoneNumber ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "8801700000000";

  const resolvedMessage =
    defaultMessage ||
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ||
    "Hello Elourá! I have a question about authentic skincare products.";

  const resolvedAvatar =
    avatarUrl ||
    process.env.NEXT_PUBLIC_CHAT_AVATAR_URL ||
    "https://res.cloudinary.com/rdol2wze/image/upload/v1794094950/eloura/branding/eloura_support_avatar.jpg";

  // 2. Never show on admin or staff routes
  const isAdminRoute = pathname?.startsWith("/admin");

  // 3. Optional: only show for logged-in customers if requireAuth is enabled
  const shouldHideForAuth = requireAuth && !user;

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Don't render on admin routes or if auth condition is not met
  if (isAdminRoute || shouldHideForAuth) {
    return null;
  }

  // Pre-filled WhatsApp link URL (sanitizes '+', '-', ' ' or non-digits)
  const cleanPhone = String(resolvedPhone).replace(/[^\d]/g, "");
  const encodedText = encodeURIComponent(resolvedMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 select-none"
    >
      {/* ── Chat Popup Card ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Customer Support Chat"
          className="absolute bottom-16 right-0 mb-2 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 rounded-3xl border border-[#F2E8E6] dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl p-5 text-left animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-visible shadow-xs">
                {!avatarError && resolvedAvatar ? (
                  <Image
                    src={resolvedAvatar}
                    alt="Elourá Support"
                    width={40}
                    height={40}
                    onError={() => setAvatarError(true)}
                    className="h-10 w-10 rounded-full object-cover border border-pink-200/60 dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9B4F5E] text-white font-serif font-bold text-base">
                    E
                  </div>
                )}
                {/* Active online pulse dot */}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-2xs" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  Elourá Support
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online • Replies quickly
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <IoClose className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Bubble Message */}
          <div className="py-4">
            <div className="rounded-2xl bg-[#FAF7F5] dark:bg-gray-800/60 p-3.5 text-xs text-gray-700 dark:text-gray-200 leading-relaxed border border-[#F2E8E6]/60 dark:border-gray-700/60">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Hi there! 👋
              </p>
              <p>
                How can we help you with your skincare routine or order today?
                Tap below to chat with our team on WhatsApp.
              </p>
            </div>
          </div>

          {/* Action: Open WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#25D366]/25 transition-all duration-200 cursor-pointer hover:shadow-lg"
          >
            <IoLogoWhatsapp className="h-5 w-5 shrink-0" />
            <span>Chat on WhatsApp</span>
          </a>

          {/* Trust Footer */}
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2.5">
            Direct & encrypted customer helpline
          </p>
        </div>
      )}

      {/* ── Floating Round Button (56px) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close chat" : "Open customer support chat"}
        aria-expanded={isOpen}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-[#9B4F5E]/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#9B4F5E]/20 ${
          isOpen
            ? "bg-gray-800 dark:bg-gray-700"
            : "bg-[#9B4F5E] hover:bg-[#843f4e]"
        }`}
      >
        {isOpen ? (
          <IoClose className="h-7 w-7 transition-transform duration-200" />
        ) : (
          <>
            <IoChatbubbleEllipses className="h-7 w-7 transition-transform duration-200" />
            {/* Green online badge on the button */}
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}

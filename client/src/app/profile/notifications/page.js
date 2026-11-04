"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { useNotifications } from "@/context/NotificationContext";
import { notificationService } from "@/services/notificationService";
import {
  FaBell,
  FaCheck,
  FaTrashAlt,
  FaShoppingBag,
  FaShieldAlt,
  FaTag,
  FaTruck,
  FaCheckCircle,
  FaBoxOpen,
  FaLock,
  FaExclamationCircle,
} from "react-icons/fa";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
}

function getNotificationIcon(type) {
  if (type === "order.placed") return <FaShoppingBag className="h-4 w-4 text-[#9B4F5E]" />;
  if (type === "order.confirmed") return <FaCheckCircle className="h-4 w-4 text-emerald-600" />;
  if (type === "order.shipped") return <FaTruck className="h-4 w-4 text-blue-600" />;
  if (type === "order.delivered") return <FaBoxOpen className="h-4 w-4 text-emerald-700" />;
  if (type === "order.cancelled") return <FaExclamationCircle className="h-4 w-4 text-red-600" />;
  if (type?.startsWith("security.")) return <FaShieldAlt className="h-4 w-4 text-amber-600" />;
  if (type?.startsWith("wishlist.")) return <FaTag className="h-4 w-4 text-[#9B4F5E]" />;
  return <FaBell className="h-4 w-4 text-gray-600" />;
}

export default function NotificationsPage() {
  const { unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchUnreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState("feed"); // 'feed' | 'preferences'
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [feedData, setFeedData] = useState({ notifications: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [page, setPage] = useState(1);

  // Preferences state
  const [preferences, setPreferences] = useState([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefStatusMessage, setPrefStatusMessage] = useState(null);

  const loadFeed = useCallback(async (targetPage = 1, unreadOnly = false) => {
    setLoadingFeed(true);
    try {
      const res = await notificationService.getNotifications({
        page: targetPage,
        limit: 15,
        unreadOnly,
      });
      setFeedData(res);
    } catch {
      // Error handled gracefully
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch {
      // Error handled
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "feed") {
      loadFeed(page, filterUnreadOnly);
    } else if (activeTab === "preferences") {
      loadPreferences();
    }
  }, [activeTab, page, filterUnreadOnly, loadFeed, loadPreferences]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setFeedData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
    }));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setFeedData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read_at: new Date().toISOString() })),
    }));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setFeedData((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
      pagination: { ...prev.pagination, total: Math.max(0, prev.pagination.total - 1) },
    }));
  };

  const handleTogglePref = (category, channel) => {
    setPreferences((prev) =>
      prev.map((cat) => {
        if (cat.category !== category || cat.locked) return cat;
        return {
          ...cat,
          channels: {
            ...cat.channels,
            [channel]: !cat.channels[channel],
          },
        };
      })
    );
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefStatusMessage(null);
    try {
      const updates = [];
      preferences.forEach((cat) => {
        if (!cat.locked) {
          Object.entries(cat.channels).forEach(([channel, enabled]) => {
            updates.push({ category: cat.category, channel, enabled });
          });
        }
      });

      const updated = await notificationService.updatePreferences(updates);
      setPreferences(updated);
      setPrefStatusMessage({ type: "success", text: "Notification preferences saved successfully." });
    } catch (err) {
      setPrefStatusMessage({ type: "error", text: err.message || "Failed to update preferences." });
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <ProfileLayout
      title="Notifications & Alerts"
      description="Stay updated on your orders, security events, and personalized skincare offers."
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "feed"
                ? "border-[#9B4F5E] text-[#9B4F5E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FaBell className="h-4 w-4" />
            Activity Feed
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#9B4F5E] px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "preferences"
                ? "border-[#9B4F5E] text-[#9B4F5E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FaShieldAlt className="h-4 w-4" />
            Notification Preferences
          </button>
        </div>

        {/* ── TAB 1: ACTIVITY FEED ── */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-2xs border border-[#F3E2E5]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterUnreadOnly(false);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !filterUnreadOnly
                      ? "bg-[#9B4F5E] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  All ({feedData.pagination.total})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterUnreadOnly(true);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filterUnreadOnly
                      ? "bg-[#9B4F5E] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#9B4F5E] hover:underline cursor-pointer"
                >
                  <FaCheck className="h-3 w-3" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification List */}
            {loadingFeed ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-[#F3E2E5] shadow-2xs">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : feedData.notifications.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-[#F3E2E5] shadow-2xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-[#9B4F5E]">
                  <FaBell className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">No notifications found</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                  {filterUnreadOnly
                    ? "You are all caught up! No unread notifications right now."
                    : "When you place orders or receive updates on your beauty items, they will appear here."}
                </p>
                {filterUnreadOnly && (
                  <button
                    type="button"
                    onClick={() => setFilterUnreadOnly(false)}
                    className="mt-4 inline-flex items-center rounded-xl bg-[#9B4F5E] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#853F4D]"
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-2xl bg-white border border-[#F3E2E5] shadow-2xs overflow-hidden">
                {feedData.notifications.map((item) => {
                  const isUnread = !item.read_at;
                  const data = typeof item.data === "string" ? JSON.parse(item.data) : item.data || {};
                  const link = data.link;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-4 p-4 transition-colors ${
                        isUnread ? "bg-pink-50/40 hover:bg-pink-50/70" : "hover:bg-gray-50/70"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs border border-[#F3E2E5]">
                          {getNotificationIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h4>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-[#9B4F5E] shrink-0" title="Unread" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {item.body}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                            <span>{formatTimeAgo(item.created_at)}</span>
                            {link && (
                              <Link
                                href={link}
                                onClick={() => isUnread && handleMarkAsRead(item.id)}
                                className="font-semibold text-[#9B4F5E] hover:underline"
                              >
                                {data.actionText || "View details →"}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item.id)}
                            title="Mark as read"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-emerald-600 transition-colors"
                          >
                            <FaCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Dismiss notification"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600 transition-colors"
                        >
                          <FaTrashAlt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {feedData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  Page {page} of {feedData.pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= feedData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: NOTIFICATION PREFERENCES ── */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            {prefStatusMessage && (
              <div
                role="alert"
                className={`rounded-xl border p-3 text-sm ${
                  prefStatusMessage.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {prefStatusMessage.text}
              </div>
            )}

            {loadingPrefs ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-[#F3E2E5] shadow-2xs">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                <p className="mt-2 text-sm text-gray-500">Loading your preferences...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {preferences.map((cat) => (
                  <div
                    key={cat.category}
                    className="rounded-2xl bg-white p-5 border border-[#F3E2E5] shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{cat.title}</h4>
                          {cat.locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                              <FaLock className="h-2.5 w-2.5" />
                              Always Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{cat.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      {/* Email Channel */}
                      {cat.channels.email !== undefined && (
                        <label className={`flex items-center justify-between p-3 rounded-xl border ${cat.channels.email ? 'border-pink-200 bg-pink-50/20' : 'border-gray-200 bg-gray-50/30'} ${cat.locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-[#9B4F5E]'}`}>
                          <div className="text-xs font-medium text-gray-800">
                            Email Notifications
                            <span className="block text-[11px] text-gray-400">Order receipts & account security</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={cat.channels.email}
                            disabled={cat.locked}
                            onChange={() => handleTogglePref(cat.category, "email")}
                            className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                          />
                        </label>
                      )}

                      {/* In-App Channel */}
                      {cat.channels.in_app !== undefined && (
                        <label className={`flex items-center justify-between p-3 rounded-xl border ${cat.channels.in_app ? 'border-pink-200 bg-pink-50/20' : 'border-gray-200 bg-gray-50/30'} ${cat.locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-[#9B4F5E]'}`}>
                          <div className="text-xs font-medium text-gray-800">
                            In-App Bell Alerts
                            <span className="block text-[11px] text-gray-400">Shown in your website header bell</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={cat.channels.in_app}
                            disabled={cat.locked}
                            onChange={() => handleTogglePref(cat.category, "in_app")}
                            className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                          />
                        </label>
                      )}

                      {/* SMS Channel */}
                      {cat.channels.sms !== undefined && (
                        <label className={`flex items-center justify-between p-3 rounded-xl border ${cat.channels.sms ? 'border-pink-200 bg-pink-50/20' : 'border-gray-200 bg-gray-50/30'} cursor-pointer hover:border-[#9B4F5E]`}>
                          <div className="text-xs font-medium text-gray-800">
                            SMS Text Messages
                            <span className="block text-[11px] text-gray-400">Delivery OTP and shipping alerts</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={cat.channels.sms}
                            onChange={() => handleTogglePref(cat.category, "sms")}
                            className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    className="flex items-center gap-2 rounded-xl bg-[#9B4F5E] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#853F4D] disabled:opacity-60 transition-colors"
                  >
                    {savingPrefs ? "Saving changes..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}


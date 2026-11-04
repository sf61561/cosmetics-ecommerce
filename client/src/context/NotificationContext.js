"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pollTimerRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      if (user.role === "ADMIN") {
        const count = await notificationService.getAdminUnreadCount();
        setUnreadCount(count);
      } else {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      }
    } catch {
      // Gracefully ignore network/auth errors in background poll
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      if (user.role === "ADMIN") {
        const res = await notificationService.getAdminNotifications({ limit: 10 });
        setNotifications(res.notifications || []);
      } else {
        const res = await notificationService.getNotifications({ limit: 10 });
        setNotifications(res.notifications || []);
      }
    } catch {
      // Ignore background errors
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch and 60-second polling
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    fetchNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [user, authLoading, fetchUnreadCount, fetchNotifications]);

  const markAsRead = async (id) => {
    if (!id) return;
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      if (user?.role === "ADMIN") {
        await notificationService.markAdminAsRead(id);
      } else {
        await notificationService.markAsRead(id);
      }
    } catch {
      // Re-fetch on error to sync true state
      fetchUnreadCount();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      if (user?.role === "ADMIN") {
        await notificationService.markAllAdminAsRead();
      } else {
        await notificationService.markAllAsRead();
      }
    } catch {
      fetchUnreadCount();
    }
  };

  const deleteNotification = async (id) => {
    if (!id) return;
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read_at) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationService.deleteNotification(id);
    } catch {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}


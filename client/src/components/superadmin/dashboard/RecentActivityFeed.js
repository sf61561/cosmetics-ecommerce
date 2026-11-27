"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import superadminService from "@/services/superadminService";
import { IoDocumentTextOutline, IoRefreshOutline, IoArrowForward } from "react-icons/io5";

const ACTION_FILTERS = [
  { value: "", label: "All actions" },
  { value: "ORDER_COSTS_UPDATED", label: "Order costs entered" },
  { value: "ORDER_STATUS_CHANGED", label: "Order status changed" },
  { value: "RETURN_APPROVED", label: "Return approved" },
  { value: "RETURN_REFUNDED", label: "Return refunded" },
  { value: "ADMIN_INVITE_SENT", label: "Invite sent" },
  { value: "ADMIN_PERMISSIONS_UPDATED", label: "Permissions updated" },
  { value: "LOGIN_SUCCEEDED", label: "Sign in" },
  { value: "LOGIN_FAILED", label: "Failed login" },
  { value: "ACCESS_DENIED", label: "Access denied" },
];

export default function RecentActivityFeed({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [actors, setActors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    const res = await superadminService.getDashboardActivity({
      page,
      limit: 12,
      actorId,
      action,
    });
    return res?.data || {};
  }, [page, actorId, action]);

  const handleManualRefresh = useCallback(() => {
    setLoading(true);
    setError("");
    loadActivity()
      .then((payload) => {
        setItems(payload.items || []);
        setActors(payload.actors || []);
        setPagination(payload.pagination || { page: 1, totalPages: 1, total: 0 });
      })
      .catch((err) => {
        setError(err.message || "Failed to load activity feed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadActivity]);

  useEffect(() => {
    let active = true;
    const run = () => {
      loadActivity()
        .then((payload) => {
          if (!active) return;
          setItems(payload.items || []);
          setActors(payload.actors || []);
          setPagination(payload.pagination || { page: 1, totalPages: 1, total: 0 });
          setError("");
        })
        .catch((err) => {
          if (!active) return;
          setError(err.message || "Failed to load activity feed.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        run();
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [loadActivity, refreshKey]);

  return (
    <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
            <IoDocumentTextOutline className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Recent Activity Feed
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Audit log activity in Bangladesh time (refreshes every 45s)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter activity by admin"
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200"
          >
            <option value="">All admins</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.email} ({a.role})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter activity by action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            title="Refresh activity"
          >
            <IoRefreshOutline className="h-4 w-4" />
          </button>

          <Link
            href="/superadmin/audit-logs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] hover:underline ml-1"
          >
            <span>Full log</span>
            <IoArrowForward className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={handleManualRefresh} className="font-semibold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="py-10 text-center text-xs text-gray-400">Loading activity feed...</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs text-gray-400">
          No audit events match the selected filters.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                    item.actorType === "SUPERADMIN"
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : item.actorType === "ADMIN"
                      ? "bg-pink-50 text-[#9B4F5E] dark:bg-pink-950/60 dark:text-pink-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {item.actorType}
                </span>
                <p className="text-gray-800 dark:text-gray-200 truncate">{item.message}</p>
              </div>
              <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                {new Date(item.createdAt).toLocaleString("en-GB", {
                  timeZone: "Asia/Dhaka",
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import {
  IoPeopleOutline,
  IoShieldCheckmarkOutline,
  IoPersonAddOutline,
  IoLogOutOutline,
  IoKeyOutline,
  IoWarningOutline,
  IoArrowForward,
} from "react-icons/io5";

function formatDhakaDateTime(dateStr) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function TeamSecurityPanels({
  team,
  security,
  isLoading,
  onInviteAdmin,
  onEditPermissions,
  onForceLogout,
}) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
        <div className="h-80 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
      </div>
    );
  }

  const summary = team?.summary || { active: 0, invited: 0, disabled: 0, total: 0 };
  const admins = team?.admins || [];
  const recentLogins = security?.recentLogins || [];
  const permChanges = security?.recentPermissionChanges || [];
  const failedLogins24h = security?.failedLogins24h || 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Team Panel */}
      <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-[#8B5CF6] dark:bg-purple-950/60 dark:text-purple-300">
                <IoPeopleOutline className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Team &amp; Admin Performance
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Active, invited, and disabled store administrators
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onInviteAdmin}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#7C3AED] transition-colors cursor-pointer"
              >
                <IoPersonAddOutline className="h-3.5 w-3.5" />
                <span>Invite</span>
              </button>
              <Link
                href="/superadmin/admins"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] hover:underline"
              >
                <span>All</span>
                <IoArrowForward className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.active}</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Active</p>
            </div>
            <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{summary.invited}</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">Invited</p>
            </div>
            <div className="rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-3">
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{summary.disabled}</p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400">Disabled</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase text-gray-400">
                <tr>
                  <th className="py-2 pr-3">Admin</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Today</th>
                  <th className="py-2 px-2 text-right">Orders / Ret / Cost</th>
                  <th className="py-2 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      No store administrators invited yet.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                          {admin.name || admin.email}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Last: {formatDhakaDateTime(admin.lastLoginAt)}
                        </p>
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            admin.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : admin.status === "INVITED"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium tabular-nums">
                        {admin.actionsToday}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {admin.ordersHandled} / {admin.returnsProcessed} / {admin.costsEntered}
                      </td>
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        {admin.status !== "INVITED" && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="Edit Permissions"
                              onClick={() => onEditPermissions(admin)}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-purple-50 hover:text-[#8B5CF6] dark:hover:bg-gray-800 cursor-pointer"
                            >
                              <IoKeyOutline className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Force Logout"
                              onClick={() => onForceLogout(admin)}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-gray-800 cursor-pointer"
                            >
                              <IoLogOutOutline className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security Panel */}
      <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
              <IoShieldCheckmarkOutline className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Security Overview
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Recent admin logins, failed attempts, and permission updates
              </p>
            </div>
          </div>

          <Link
            href="/superadmin/audit-logs"
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <IoWarningOutline className={`h-3.5 w-3.5 ${failedLogins24h > 0 ? "text-rose-500" : "text-gray-400"}`} />
            <span>Failed 24h: {failedLogins24h}</span>
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Recent Admin Logins
          </p>
          {recentLogins.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No recent admin logins recorded.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentLogins.slice(0, 4).map((login) => (
                <div key={login.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {login.actorName}
                      </span>
                      <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                        {login.actorRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {login.device} · {login.ipAddress}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {formatDhakaDateTime(login.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Recent Permission &amp; Role Changes
          </p>
          {permChanges.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No permission changes recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {permChanges.slice(0, 4).map((chg) => (
                <div key={chg.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-gray-800 dark:text-gray-200 truncate">
                      <span className="font-semibold">{chg.actorName}</span> ·{" "}
                      {String(chg.action || "").toLowerCase().replaceAll("_", " ")} →{" "}
                      <span className="font-medium">{chg.targetName}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {formatDhakaDateTime(chg.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

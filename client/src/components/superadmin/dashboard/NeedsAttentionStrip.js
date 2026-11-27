"use client";

import Link from "next/link";
import {
  IoAlertCircle,
  IoAlertCircleOutline,
  IoArrowForward,
  IoBanOutline,
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoInformationCircle,
  IoMailUnreadOutline,
  IoRefreshOutline,
  IoReturnUpBackOutline,
  IoShieldOutline,
  IoWarning,
} from "react-icons/io5";

export const ATTENTION_THRESHOLDS = {
  accessDeniedHigh: 10,
  failedLoginsMin: 3,
  failedLoginsHigh: 10,
};

export function formatAttentionCount(value) {
  const num = Number(value || 0);
  if (num > 999) return "999+";
  return num.toLocaleString("en-BD");
}

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    Icon: IoWarning,
    cardClass:
      "border border-rose-200/80 border-l-4 border-l-rose-600 bg-rose-50/75 text-zinc-900 hover:bg-rose-50 focus-visible:ring-rose-600 dark:border-rose-900/70 dark:border-l-rose-500 dark:bg-rose-950/35 dark:text-zinc-100 dark:hover:bg-rose-950/55",
    countClass: "text-rose-700 dark:text-rose-300",
    badgeClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
    iconClass: "text-rose-600 dark:text-rose-400",
    actionClass: "text-rose-700 dark:text-rose-300",
  },
  medium: {
    label: "Medium",
    Icon: IoAlertCircle,
    cardClass:
      "border border-amber-200/80 border-l-4 border-l-amber-500 bg-amber-50/75 text-zinc-900 hover:bg-amber-50 focus-visible:ring-amber-600 dark:border-amber-900/70 dark:border-l-amber-400 dark:bg-amber-950/30 dark:text-zinc-100 dark:hover:bg-amber-950/50",
    countClass: "text-amber-700 dark:text-amber-300",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
    iconClass: "text-amber-600 dark:text-amber-400",
    actionClass: "text-amber-800 dark:text-amber-300",
  },
  profit: {
    label: "Medium",
    Icon: IoInformationCircle,
    cardClass:
      "border border-blue-200/80 border-l-4 border-l-blue-600 bg-blue-50/75 text-zinc-900 hover:bg-blue-50 focus-visible:ring-blue-600 dark:border-blue-900/70 dark:border-l-blue-400 dark:bg-blue-950/30 dark:text-zinc-100 dark:hover:bg-blue-950/50",
    countClass: "text-blue-700 dark:text-blue-300",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
    actionClass: "text-blue-700 dark:text-blue-300",
  },
};

function buildAuditWindowHref(action, win) {
  const params = new URLSearchParams();
  params.set("action", action);
  if (win?.from) params.set("from", win.from);
  if (win?.to) params.set("to", win.to);
  return `/superadmin/audit-logs?${params.toString()}`;
}

export function buildAttentionAlerts(attention) {
  if (!attention) return [];

  const accessDenied = Number(attention.access_denied_24h ?? attention.accessDenied24h ?? 0);
  const returnsWaiting = Number(attention.returns_waiting ?? attention.returnsWaitingApproval ?? 0);
  const costPending = Number(attention.cost_pending_orders ?? attention.ordersCostPending ?? 0);
  const refundsFailed = Number(attention.refundsFailed || 0);
  const failedLogins = Number(attention.failedLogins24h || 0);
  const pendingInvites = Number(attention.pendingInvites || 0);
  const expiredInvites = Number(attention.expiredInvites || 0);
  const win = attention.accessDeniedWindow || null;

  return [
    accessDenied > 0 && {
      key: "accessDenied24h",
      severity: accessDenied > ATTENTION_THRESHOLDS.accessDeniedHigh ? "high" : "medium",
      title: "Access-Denied Attempts",
      count: accessDenied,
      description: "Last 24 hours",
      actionText: "View logs",
      href: buildAuditWindowHref("ACCESS_DENIED", win),
      icon: IoBanOutline,
      ariaLabel: `${accessDenied.toLocaleString("en-BD")} access-denied attempts in the last 24 hours (${
        accessDenied > ATTENTION_THRESHOLDS.accessDeniedHigh ? "High" : "Medium"
      } severity). View logs.`,
    },
    failedLogins >= ATTENTION_THRESHOLDS.failedLoginsMin && {
      key: "failedLogins24h",
      severity: failedLogins > ATTENTION_THRESHOLDS.failedLoginsHigh ? "high" : "medium",
      title: "Repeated Failed Logins",
      count: failedLogins,
      description: "Last 24 hours",
      actionText: "View logs",
      href: buildAuditWindowHref("LOGIN_FAILED", win),
      icon: IoShieldOutline,
      ariaLabel: `${failedLogins.toLocaleString("en-BD")} failed sign-in attempts in the last 24 hours. View logs.`,
    },
    refundsFailed > 0 && {
      key: "refundsFailed",
      severity: "high",
      title: "Failed Refunds",
      count: refundsFailed,
      description: "Retry needed",
      actionText: "View returns",
      href: "/admin/returns",
      icon: IoAlertCircleOutline,
      ariaLabel: `${refundsFailed.toLocaleString("en-BD")} failed refunds needing retry (High severity). View returns.`,
    },
    returnsWaiting > 0 && {
      key: "returnsWaitingApproval",
      severity: "medium",
      title: "Returns Waiting Approval",
      count: returnsWaiting,
      description: "Needs review",
      actionText: "Review returns",
      href: "/admin/returns?status=REQUESTED",
      icon: IoReturnUpBackOutline,
      ariaLabel: `${returnsWaiting.toLocaleString("en-BD")} returns waiting approval (Medium severity). Review returns.`,
    },
    costPending > 0 && {
      key: "ordersCostPending",
      severity: "profit",
      title: "Orders Cost Pending",
      count: costPending,
      description: "Missing item cost",
      actionText: "View orders",
      href: "/admin/orders?costStatus=pending",
      icon: IoCashOutline,
      ariaLabel: `${costPending.toLocaleString("en-BD")} orders with cost pending (Medium severity). View orders.`,
    },
    pendingInvites > 0 && {
      key: "pendingInvites",
      severity: expiredInvites > 0 ? "high" : "medium",
      title: "Pending Invites",
      count: pendingInvites,
      description: expiredInvites > 0 ? `${expiredInvites} expired` : "Awaiting setup",
      actionText: "Review admins",
      href: "/superadmin/admins?status=INVITED",
      icon: IoMailUnreadOutline,
      ariaLabel: `${pendingInvites.toLocaleString("en-BD")} pending admin invites${
        expiredInvites > 0 ? ` (${expiredInvites} expired)` : ""
      }. Review admins.`,
    },
  ].filter(Boolean);
}

function AttentionCard({ alert }) {
  const Icon = alert.icon;
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const SeverityIcon = severity.Icon;
  const displayCount = formatAttentionCount(alert.count);

  return (
    <Link
      href={alert.href}
      aria-label={alert.ariaLabel}
      title={alert.count > 999 ? `${alert.count.toLocaleString("en-BD")} total` : undefined}
      className={`group flex flex-col justify-between gap-3 rounded-2xl p-4 shadow-2xs transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${severity.cardClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4.5 w-4.5 shrink-0 ${severity.iconClass}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {alert.title}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${severity.badgeClass}`}
        >
          <SeverityIcon className="h-3 w-3" aria-hidden="true" />
          <span>{severity.label}</span>
        </span>
      </div>

      <div>
        <p className={`text-3xl font-bold tracking-tight tabular-nums ${severity.countClass}`}>
          {displayCount}
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{alert.description}</p>
      </div>

      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${severity.actionClass}`}>
        <span>{alert.actionText}</span>
        <IoArrowForward
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export default function NeedsAttentionStrip({ attention, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <section aria-labelledby="needs-attention-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-36 rounded-2xl border border-zinc-200/80 border-l-4 border-l-zinc-300 bg-white dark:border-zinc-800 dark:border-l-zinc-700 dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error && !attention) {
    return (
      <section aria-labelledby="needs-attention-heading" className="space-y-3">
        <h2
          id="needs-attention-heading"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <IoWarning className="h-4 w-4 text-rose-500" aria-hidden="true" />
          <span>Needs Attention</span>
        </h2>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3.5 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200"
        >
          <div className="flex items-center gap-2">
            <IoAlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900/60"
            >
              <IoRefreshOutline className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!attention) return null;

  const alerts = buildAttentionAlerts(attention);

  if (alerts.length === 0) {
    return (
      <section aria-labelledby="needs-attention-heading">
        <h2 id="needs-attention-heading" className="sr-only">
          Needs Attention
        </h2>
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <IoCheckmarkCircleOutline className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">All clear. Nothing needs your attention.</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="needs-attention-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="needs-attention-heading"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
        >
          <IoWarning className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <span>Needs Attention ({alerts.length})</span>
        </h2>

        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline cursor-pointer dark:text-rose-400"
          >
            <IoRefreshOutline className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Refresh failed · Retry</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {alerts.map((alert) => (
          <AttentionCard key={alert.key} alert={alert} />
        ))}
      </div>
    </section>
  );
}

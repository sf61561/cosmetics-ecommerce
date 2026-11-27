"use client";

import { useId, useState } from "react";
import {
  IoCalendarOutline,
  IoCheckmark,
  IoInformationCircleOutline,
  IoRefreshOutline,
} from "react-icons/io5";

export const DHAKA_TIMEZONE = "Asia/Dhaka";
export const MAX_CUSTOM_RANGE_DAYS = 366;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: DHAKA_TIMEZONE,
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: DHAKA_TIMEZONE,
});

const UPDATED_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: DHAKA_TIMEZONE,
});

export function getTodayDhaka() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysYmd(ymd, deltaDays) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + deltaDays);
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

export function diffDaysInclusive(fromYmd, toYmd) {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.floor((end - start) / 86400000) + 1;
}

export function getPresetDateRange(preset, todayStr = getTodayDhaka()) {
  if (preset === "today") {
    return { from: todayStr, to: todayStr };
  }
  if (preset === "7d") {
    return { from: addDaysYmd(todayStr, -6), to: todayStr };
  }
  return { from: `${todayStr.slice(0, 8)}01`, to: todayStr };
}

export function matchPresetForDates(from, to, todayStr = getTodayDhaka()) {
  for (const preset of ["today", "7d", "month"]) {
    const bounds = getPresetDateRange(preset, todayStr);
    if (bounds.from === from && bounds.to === to) {
      return preset;
    }
  }
  return "custom";
}

export function validateCustomRange(from, to) {
  if (!DATE_PATTERN.test(from || "") || !DATE_PATTERN.test(to || "")) {
    return "Select both start and end dates.";
  }
  if (from > to) {
    return "Start date cannot be after end date.";
  }
  const days = diffDaysInclusive(from, to);
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    return "Custom range cannot exceed 12 months (366 days).";
  }
  return "";
}

export function formatDhakaRangeLabel(from, to) {
  if (!DATE_PATTERN.test(from || "") || !DATE_PATTERN.test(to || "")) {
    return "";
  }
  const startDate = new Date(`${from}T12:00:00+06:00`);
  const endDate = new Date(`${to}T12:00:00+06:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }
  if (from === to) {
    return FULL_DATE_FORMATTER.format(startDate);
  }
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const left = sameYear ? SHORT_MONTH_FORMATTER.format(startDate) : FULL_DATE_FORMATTER.format(startDate);
  const right = FULL_DATE_FORMATTER.format(endDate);
  return `${left} – ${right}`;
}

export function formatDhakaUpdatedTime(dateInput) {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return `Updated ${UPDATED_TIME_FORMATTER.format(date)}`;
}

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export function TitleBlock() {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Control Center · Asia/Dhaka (UTC+6)
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Super Admin Dashboard
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Business performance, team governance, and security oversight.
      </p>
    </div>
  );
}

export function DateRangeChips({ activePreset, onSelectPreset }) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      role="group"
      aria-label="Date range presets"
    >
      {DATE_PRESETS.map((item) => {
        const isActive = activePreset === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectPreset(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-200 ${
              isActive
                ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100/80 text-zinc-700 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
            }`}
          >
            <span>{item.label}</span>
            {isActive && <IoCheckmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

export function CustomRangePicker({ from, to, maxDate, error, onChangeFrom, onChangeTo }) {
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={fromId} className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={from}
            max={maxDate}
            onChange={(e) => onChangeFrom(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300"
          />
        </div>
        <span className="text-xs text-zinc-400" aria-hidden="true">
          –
        </span>
        <div className="flex items-center gap-1.5">
          <label htmlFor={toId} className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={to}
            max={maxDate}
            onChange={(e) => onChangeTo(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300"
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function RangeLabel({ from, to }) {
  const label = formatDhakaRangeLabel(from, to);
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100/70 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
      <IoCalendarOutline className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function CompareToggle({ checked, onChange }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-zinc-200"
      />
      <span>Compare with previous period</span>
    </label>
  );
}

export function LastUpdatedRefresh({ lastUpdatedAt, refreshing, onRefresh }) {
  const formattedTime = formatDhakaUpdatedTime(lastUpdatedAt);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {formattedTime || "Updating…"}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh dashboard"
        title="Refresh dashboard"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <IoRefreshOutline
          className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

export function DataRuleNote() {
  const [expanded, setExpanded] = useState(false);
  const tooltipId = useId();

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span>Sales are counted from delivered orders only</span>
      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          aria-expanded={expanded}
          aria-describedby={expanded ? tooltipId : undefined}
          aria-label="Delivered sales calculation rule details"
          className="inline-flex items-center justify-center rounded-full p-0.5 text-zinc-400 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:hover:text-zinc-200 dark:focus-visible:ring-zinc-200"
        >
          <IoInformationCircleOutline className="w-4 h-4" aria-hidden="true" />
        </button>
        {expanded && (
          <div
            id={tooltipId}
            role="tooltip"
            className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1.5 z-30 w-72 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Pending and processing orders are shown separately as Pipeline. Returns are counted by
            return date.
          </div>
        )}
      </span>
    </div>
  );
}

export default function DashboardHeader({
  preset,
  activeFrom,
  activeTo,
  customFrom,
  customTo,
  customError,
  todayStr,
  compare,
  lastUpdatedAt,
  refreshing,
  onSelectPreset,
  onChangeCustomFrom,
  onChangeCustomTo,
  onToggleCompare,
  onRefresh,
}) {
  return (
    <header className="space-y-4">
      <TitleBlock />

      {/* Sticky FilterBar positioned cleanly below fixed h-16 SuperadminNavbar */}
      <div className="sticky top-16 z-20 rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/95 space-y-2.5">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          <DateRangeChips activePreset={preset} onSelectPreset={onSelectPreset} />
          <RangeLabel from={activeFrom} to={activeTo} />
        </div>

        {preset === "custom" && (
          <CustomRangePicker
            from={customFrom}
            to={customTo}
            maxDate={todayStr}
            error={customError}
            onChangeFrom={onChangeCustomFrom}
            onChangeTo={onChangeCustomTo}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <CompareToggle checked={compare} onChange={onToggleCompare} />
          <LastUpdatedRefresh
            lastUpdatedAt={lastUpdatedAt}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      <DataRuleNote />
    </header>
  );
}

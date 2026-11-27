"use client";

import { useEffect, useState } from "react";
import { adminAuditService } from "@/services/adminAuditService";
import Pagination from "@/components/admin/Pagination";

const actions = [
  "LOGIN_SUCCEEDED", "LOGIN_FAILED", "LOGOUT", "PASSWORD_CHANGED", "ACCOUNT_PROVIDER_LINKED", "ACCOUNT_PROVIDER_UNLINKED", "EMAIL_VERIFIED", "ACCESS_DENIED",
  "PRODUCT_CREATED", "PRODUCT_UPDATED", "PRODUCT_PRICE_UPDATED", "PRODUCT_STATUS_CHANGED", "PRODUCT_DELETED",
  "INVENTORY_ADJUSTED", "ORDER_CREATED", "ORDER_UPDATED", "ORDER_STATUS_CHANGED", "CUSTOMER_PROFILE_UPDATED", "CUSTOMER_STATUS_CHANGED",
  "COLLECTION_CREATED", "COLLECTION_UPDATED", "COLLECTION_DELETED", "BRAND_CREATED", "BRAND_UPDATED", "BRAND_DELETED",
  "COUPON_CREATED", "COUPON_UPDATED", "COUPON_STATUS_CHANGED", "DELIVERY_RULE_CREATED", "DELIVERY_RULE_UPDATED",
  "HERO_SLIDER_CREATED", "HERO_SLIDER_UPDATED", "HERO_SLIDER_STATUS_CHANGED", "HERO_SLIDER_DELETED", "HERO_SLIDER_REORDERED",
  "ORDER_COSTS_UPDATED", "ORDER_OTHER_COST_ADDED", "ORDER_OTHER_COST_UPDATED", "ORDER_OTHER_COST_DELETED",
  "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RETURN_STATUS_CHANGED", "RETURN_PHOTOS_REQUESTED",
  "RETURN_INSPECTED", "RETURN_REFUNDED", "RETURN_EXCHANGED", "RETURN_COMPLETED",
  "ADMIN_INVITE_SENT", "ADMIN_INVITE_RESENT", "ADMIN_INVITE_CANCELLED", "ADMIN_INVITE_ACCEPTED",
  "ADMIN_STATUS_CHANGED", "ADMIN_PERMISSIONS_UPDATED", "ADMIN_FORCE_LOGOUT", "ADMIN_PASSWORD_RESET_TRIGGERED",
  "PASSWORD_CHANGE_CODE_REQUESTED", "PRESET_CREATED", "PRESET_UPDATED", "PRESET_DELETED",
];
const entities = ["USER", "PRODUCT", "INVENTORY", "ORDER", "COLLECTION", "BRAND", "COUPON", "DELIVERY_RULE", "HERO_SLIDER", "RETURN", "SYSTEM"];
const actorTypes = ["SUPERADMIN", "ADMIN", "CUSTOMER", "SYSTEM", "ANONYMOUS"];
const initialFilters = { search: "", action: "", actorType: "", actorId: "", entityType: "", entityId: "", from: "", to: "", page: 1, limit: 25 };
const dateTime = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const pretty = (value) => (value == null ? "—" : JSON.stringify(value, null, 2));
const controlClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#8B5CF6] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

export default function SuperadminAuditLogsPage() {
  const [filters, setFilters] = useState(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return {
      ...initialFilters,
      search: params?.get("search") || "",
      action: params?.get("action") || "",
      actorType: params?.get("actorType") || "",
      actorId: params?.get("actorId") || "",
      entityType: params?.get("entityType") || "",
      entityId: params?.get("entityId") || "",
      from: params?.get("from") || "",
      to: params?.get("to") || "",
    };
  });
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    adminAuditService
      .list(filters)
      .then((result) => {
        if (!active) return;
        setLogs(result.data || []);
        setPagination(result.pagination || { page: 1, limit: filters.limit, total: 0, totalPages: 1 });
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load audit logs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, reloadKey]);

  const updateFilter = (key, value) => {
    setLoading(true);
    setError("");
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };
  const reloadLogs = () => {
    setLoading(true);
    setError("");
    setReloadKey((current) => current + 1);
  };
  const viewDetails = async (id) => {
    setSelected(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const result = await adminAuditService.getById(id);
      setSelected(result.data);
    } catch (requestError) {
      setDetailError(requestError.message || "Could not load this audit record.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <section className="space-y-6 max-w-7xl mx-auto">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">Security &amp; governance</p>
        <h1 className="mt-1 text-2xl font-bold">Audit logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Read-only history of Super Admin, admin, security, order, return, and catalog changes.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input
          aria-label="Search audit logs"
          className={controlClass}
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
          placeholder="Search action, actor, or entity ID"
        />
        <select
          aria-label="Filter by action"
          className={controlClass}
          value={filters.action}
          onChange={(event) => updateFilter("action", event.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by actor type"
          className={controlClass}
          value={filters.actorType}
          onChange={(event) => updateFilter("actorType", event.target.value)}
        >
          <option value="">All actor types</option>
          {actorTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <input
          aria-label="Filter by actor ID"
          className={controlClass}
          value={filters.actorId}
          onChange={(event) => updateFilter("actorId", event.target.value)}
          placeholder="Actor UUID"
        />
        <select
          aria-label="Filter by entity type"
          className={controlClass}
          value={filters.entityType}
          onChange={(event) => updateFilter("entityType", event.target.value)}
        >
          <option value="">All entity types</option>
          {entities.map((entity) => (
            <option key={entity}>{entity}</option>
          ))}
        </select>
        <input
          aria-label="Filter by entity ID"
          className={controlClass}
          value={filters.entityId}
          onChange={(event) => updateFilter("entityId", event.target.value)}
          placeholder="Entity ID"
        />
        <label className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          From date
          <input
            type="date"
            className={controlClass}
            value={filters.from ? filters.from.slice(0, 10) : ""}
            onChange={(event) => updateFilter("from", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          To date
          <input
            type="date"
            className={controlClass}
            value={filters.to ? filters.to.slice(0, 10) : ""}
            onChange={(event) => updateFilter("to", event.target.value)}
          />
        </label>
      </div>

      {/* Visible Active Filter Chips */}
      {(filters.action || filters.from || filters.to || filters.actorType || filters.actorId || filters.entityType || filters.entityId || filters.search) && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active audit log filters">
          {filters.action && (
            <button
              type="button"
              onClick={() => updateFilter("action", "")}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-semibold text-[#6D28D9] dark:text-[#C4B5FD] cursor-pointer"
            >
              <span>Action: {filters.action.replaceAll("_", " ")}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {(filters.from || filters.to) && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setFilters((current) => ({ ...current, from: "", to: "", page: 1 }));
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-semibold text-[#6D28D9] dark:text-[#C4B5FD] cursor-pointer"
            >
              <span>
                {filters.from?.includes("T") && filters.to?.includes("T")
                  ? `Window: ${dateTime(filters.from)} – ${dateTime(filters.to)}`
                  : `Dates: ${filters.from || "…"} – ${filters.to || "…"}`}
              </span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {filters.actorType && (
            <button
              type="button"
              onClick={() => updateFilter("actorType", "")}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
            >
              <span>Actor: {filters.actorType}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {filters.entityType && (
            <button
              type="button"
              onClick={() => updateFilter("entityType", "")}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
            >
              <span>Entity: {filters.entityType}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {filters.search && (
            <button
              type="button"
              onClick={() => updateFilter("search", "")}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
            >
              <span>Search: {filters.search}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              setFilters(initialFilters);
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 underline dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{error}</span>
          <button onClick={reloadLogs} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="font-semibold">Change history</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pagination.total} records · timestamps shown in Dhaka time
            </p>
          </div>
          <button
            onClick={reloadLogs}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:opacity-50 dark:border-gray-700 cursor-pointer"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
              <tr>
                {["Time (Dhaka)", "Actor", "Action", "Entity", "Details"].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-gray-500">
                    Loading audit records…
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">{dateTime(log.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          log.actorType === "SUPERADMIN"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {log.actorType}
                      </span>
                      <p
                        className="mt-1 max-w-44 truncate font-mono text-[11px] text-gray-500"
                        title={log.actorId || "No user ID"}
                      >
                        {log.actorId || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-medium">{log.action.replaceAll("_", " ")}</td>
                    <td className="px-5 py-4">
                      <p>{log.entityType}</p>
                      <p
                        className="max-w-44 truncate font-mono text-[11px] text-gray-500"
                        title={log.entityId || "No entity ID"}
                      >
                        {log.entityId || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => viewDetails(log.id)}
                        className="font-semibold text-[#8B5CF6] hover:underline dark:text-purple-300 cursor-pointer"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-14 text-center">
                    <p className="font-semibold">No audit records found</p>
                    <p className="mt-1 text-sm text-gray-500">Try changing or clearing the filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          limit={filters.limit}
          onPageChange={(p) => {
            setLoading(true);
            setFilters((current) => ({ ...current, page: p }));
          }}
          onLimitChange={(l) => {
            setLoading(true);
            setFilters((current) => ({ ...current, limit: l, page: 1 }));
          }}
          limitOptions={[25, 50, 100]}
          itemLabel="audit records"
          isLoading={loading}
          variant="attached"
        />
      </div>

      {(detailLoading || selected || detailError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
              setDetailError("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <header className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">Record detail</p>
              <h2 id="audit-detail-title" className="mt-1 text-lg font-bold">
                Audit event
              </h2>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {detailLoading && <p className="py-12 text-center text-sm text-gray-500">Loading record…</p>}
              {detailError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {detailError}
                </p>
              )}
              {selected && (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ["Action", selected.action],
                      ["Time (Dhaka)", dateTime(selected.createdAt)],
                      ["Actor", `${selected.actorType}${selected.actorId ? ` · ${selected.actorId}` : ""}`],
                      ["Entity", `${selected.entityType}${selected.entityId ? ` · ${selected.entityId}` : ""}`],
                      ["Request ID", selected.requestId || "—"],
                      ["IP address", selected.ipAddress || "—"],
                      ["User agent", selected.userAgent || "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-gray-500">{label}</dt>
                        <dd className="mt-1 break-all font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ValuePanel title="Previous values" value={selected.previousValues} />
                    <ValuePanel title="New values" value={selected.newValues} />
                  </div>
                  <ValuePanel title="Safe event metadata" value={selected.metadata} />
                </>
              )}
            </div>
            <footer className="shrink-0 border-t border-gray-100 px-5 py-4 text-right dark:border-gray-800">
              <button
                onClick={() => {
                  setSelected(null);
                  setDetailError("");
                }}
                className="rounded-xl bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function ValuePanel({ title, value }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-950 dark:text-gray-300">
        {pretty(value)}
      </pre>
    </section>
  );
}

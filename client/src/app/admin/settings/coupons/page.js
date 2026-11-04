"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaPlus, FaTag } from "react-icons/fa";
import { promotionService } from "@/services/promotionService";
import Pagination from "@/components/admin/Pagination";

const EMPTY_COUPON = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  maxDiscountAmount: "",
  minOrderAmount: 0,
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perCustomerLimit: "",
  isActive: true,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [form, setForm] = useState(EMPTY_COUPON);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadCoupons = async (currentPage = page, currentLimit = limit) => {
    setIsLoading(true);
    try {
      const response = await promotionService.getCoupons({ page: currentPage, limit: currentLimit });
      setCoupons(response.data || []);
      if (response.pagination) setPagination(response.pagination);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons(page, limit);
  }, [page, limit]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      if (editingId) await promotionService.updateCoupon(editingId, form);
      else await promotionService.createCoupon(form);
      setForm(EMPTY_COUPON);
      setEditingId(null);
      setMessage({ type: "success", text: "Coupon saved." });
      await loadCoupons();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (coupon) => {
    try {
      await promotionService.updateCouponStatus(coupon.id, !coupon.isActive);
      await loadCoupons();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link href="/admin/settings" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#9B4F5E] hover:text-[#843F4E]">
            <FaArrowLeft /> Back to Settings
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Marketing</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create controlled discounts without trusting browser totals.</p>
        </div>
        <div className="rounded-2xl bg-[#FBF0F0] p-4 text-sm dark:bg-gray-800"><FaTag className="mb-2 text-[#9B4F5E]" /><span className="font-semibold">{coupons.filter((coupon) => coupon.isActive).length}</span> active coupons</div>
      </header>

      {message && <div className={`rounded-xl border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}

      <form onSubmit={submit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? "Edit coupon" : "Create coupon"}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_COUPON); }} className="text-xs text-gray-500">Cancel edit</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["code", "Coupon code", "text"],
            ["discountValue", "Discount value", "number"],
            ["maxDiscountAmount", "Maximum discount", "number"],
            ["minOrderAmount", "Minimum order", "number"],
            ["startsAt", "Starts at", "datetime-local"],
            ["expiresAt", "Expires at", "datetime-local"],
            ["usageLimit", "Total usage limit", "number"],
            ["perCustomerLimit", "Per-customer limit", "number"],
          ].map(([key, label, type]) => <label key={key} className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<input type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#9B4F5E] dark:border-gray-700 dark:bg-gray-800" /></label>)}
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Discount type<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value, discountValue: event.target.value === "FREE_DELIVERY" ? 0 : form.discountValue })} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="FREE_DELIVERY">Free delivery</option></select></label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2 lg:col-span-4 lg:col-start-1">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="2" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" /></label>
        </div>
        <button disabled={isSaving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#9B4F5E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:opacity-60"><FaPlus />{isSaving ? "Saving..." : editingId ? "Save changes" : "Create coupon"}</button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60">
              <tr>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Discount</th>
                <th className="px-5 py-4">Validity</th>
                <th className="px-5 py-4">Usage</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
                      Loading coupons...
                    </span>
                  </td>
                </tr>
              )}
              {!isLoading && coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">{coupon.code}</td>
                  <td className="px-5 py-4">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${coupon.discountValue}%`
                      : coupon.discountType === "FREE_DELIVERY"
                      ? "Free delivery"
                      : `৳${coupon.discountValue.toLocaleString()}`}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No expiry"}
                  </td>
                  <td className="px-5 py-4">
                    {coupon.usageCount}{coupon.usageLimit === null ? "" : ` / ${coupon.usageLimit}`}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="space-x-3 px-5 py-4 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setEditingId(coupon.id);
                        setForm({
                          ...coupon,
                          maxDiscountAmount: coupon.maxDiscountAmount ?? "",
                          usageLimit: coupon.usageLimit ?? "",
                          perCustomerLimit: coupon.perCustomerLimit ?? "",
                        });
                      }}
                      className="text-[#9B4F5E] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(coupon)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && coupons.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-500">
                    No coupons configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination ── */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          itemLabel="coupons"
          isLoading={isLoading}
          variant="attached"
        />
      </div>
    </div>
  );
}

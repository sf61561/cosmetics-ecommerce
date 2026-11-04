"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaSave, FaTruck, FaMapMarkerAlt, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { promotionService } from "@/services/promotionService";

export default function DeliverySettingsPage() {
  const [insideDhaka, setInsideDhaka] = useState({
    id: null,
    deliveryCharge: 70,
    estimatedDeliveryTime: "2-3 business days",
    isActive: true,
  });

  const [outsideDhaka, setOutsideDhaka] = useState({
    id: null,
    deliveryCharge: 130,
    estimatedDeliveryTime: "3-5 business days",
    isActive: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await promotionService.getDeliverySettings();
      const rules = response.data || [];
      const inside = rules.find((r) => r.zone === "INSIDE_DHAKA");
      const outside = rules.find((r) => r.zone === "OUTSIDE_DHAKA");

      if (inside) {
        setInsideDhaka({
          id: inside.id,
          deliveryCharge: inside.deliveryCharge,
          estimatedDeliveryTime: inside.estimatedDeliveryTime || "2-3 business days",
          isActive: inside.isActive !== false,
        });
      }
      if (outside) {
        setOutsideDhaka({
          id: outside.id,
          deliveryCharge: outside.deliveryCharge,
          estimatedDeliveryTime: outside.estimatedDeliveryTime || "3-5 business days",
          isActive: outside.isActive !== false,
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to load delivery settings." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await promotionService.updateDeliverySettings({
        insideDhaka: {
          deliveryCharge: Number(insideDhaka.deliveryCharge),
          estimatedDeliveryTime: insideDhaka.estimatedDeliveryTime,
          isActive: insideDhaka.isActive,
        },
        outsideDhaka: {
          deliveryCharge: Number(outsideDhaka.deliveryCharge),
          estimatedDeliveryTime: outsideDhaka.estimatedDeliveryTime,
          isActive: outsideDhaka.isActive,
        },
      });

      setMessage({ type: "success", text: "Delivery charges updated successfully." });
      await loadSettings();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to update delivery charges." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin/settings"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#9B4F5E] hover:text-[#843F4E] transition-colors"
          >
            <FaArrowLeft className="h-3 w-3" /> Back to Settings
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B4F5E]">Operations</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Delivery Charges</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure standard delivery charges for Inside Dhaka and Outside Dhaka.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#FBF0F0] px-4 py-3 dark:bg-gray-800 border border-rose-100 dark:border-gray-800">
          <FaTruck className="text-lg text-[#9B4F5E] dark:text-[#E08A9B]" />
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">2 Delivery Zones</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Inside Dhaka & Outside Dhaka</p>
          </div>
        </div>
      </header>

      {/* ── Feedback Message Banner ── */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium transition-all ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {message.type === "error" ? (
            <FaExclamationCircle className="h-4 w-4 shrink-0" />
          ) : (
            <FaCheckCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Main Delivery Settings Form ── */}
      {isLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 shadow-xs">
          <div className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
            <span>Loading delivery settings...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* ── Card 1: Inside Dhaka ── */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#9B4F5E] dark:bg-rose-950/40">
                    <FaMapMarkerAlt className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-gray-100">Inside Dhaka</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dhaka City standard delivery</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                  Zone 1
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Delivery Charge (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={insideDhaka.deliveryCharge}
                    onChange={(e) =>
                      setInsideDhaka((curr) => ({ ...curr, deliveryCharge: e.target.value }))
                    }
                    placeholder="70"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-8 pr-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all focus:border-[#9B4F5E] dark:focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 dark:focus:ring-[#9B4F5E]/30"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Standard rate applied when delivery address is in Dhaka.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Estimated Delivery Time
                </label>
                <input
                  type="text"
                  value={insideDhaka.estimatedDeliveryTime}
                  onChange={(e) =>
                    setInsideDhaka((curr) => ({ ...curr, estimatedDeliveryTime: e.target.value }))
                  }
                  placeholder="e.g. 2-3 business days"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all focus:border-[#9B4F5E] dark:focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 dark:focus:ring-[#9B4F5E]/30"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insideDhaka.isActive}
                    onChange={(e) =>
                      setInsideDhaka((curr) => ({ ...curr, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E] dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-[#9B4F5E]"
                  />
                  <span>Active for customer checkout</span>
                </label>
              </div>
            </div>

            {/* ── Card 2: Outside Dhaka ── */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <FaTruck className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-gray-100">Outside Dhaka</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">All other divisions and districts</p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  Zone 2
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Delivery Charge (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={outsideDhaka.deliveryCharge}
                    onChange={(e) =>
                      setOutsideDhaka((curr) => ({ ...curr, deliveryCharge: e.target.value }))
                    }
                    placeholder="130"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-8 pr-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all focus:border-[#9B4F5E] dark:focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 dark:focus:ring-[#9B4F5E]/30"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Standard courier rate applied for delivery outside Dhaka.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Estimated Delivery Time
                </label>
                <input
                  type="text"
                  value={outsideDhaka.estimatedDeliveryTime}
                  onChange={(e) =>
                    setOutsideDhaka((curr) => ({ ...curr, estimatedDeliveryTime: e.target.value }))
                  }
                  placeholder="e.g. 3-5 business days"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all focus:border-[#9B4F5E] dark:focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 dark:focus:ring-[#9B4F5E]/30"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outsideDhaka.isActive}
                    onChange={(e) =>
                      setOutsideDhaka((curr) => ({ ...curr, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded-sm border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E] dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-[#9B4F5E]"
                  />
                  <span>Active for customer checkout</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Customer Checkout Preview ── */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Storefront Checkout Preview
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                  Inside Dhaka (৳{Number(insideDhaka.deliveryCharge || 0).toLocaleString()})
                </span>
                <span className="text-gray-500 dark:text-gray-400 mt-0.5 block">{insideDhaka.estimatedDeliveryTime}</span>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                  Outside Dhaka (৳{Number(outsideDhaka.deliveryCharge || 0).toLocaleString()})
                </span>
                <span className="text-gray-500 dark:text-gray-400 mt-0.5 block">{outsideDhaka.estimatedDeliveryTime}</span>
              </div>
            </div>
          </div>

          {/* ── Save Action Button ── */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#9B4F5E] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#843F4E] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <FaSave className="h-4 w-4" />
              <span>{isSaving ? "Saving charges..." : "Save Delivery Charges"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

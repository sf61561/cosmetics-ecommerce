import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure store settings, delivery, payments, and administrative preferences.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Link
          href="/admin/settings/delivery"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition hover:border-[#9B4F5E] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Settings</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Configure delivery zones, charges, free-delivery thresholds, and estimated timeframes.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#9B4F5E]">Manage delivery settings</span>
        </Link>
        <Link
          href="/admin/settings/coupons"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition hover:border-[#9B4F5E] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coupons</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Create and manage controlled promotional discounts for customers.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#9B4F5E]">Manage coupons</span>
        </Link>
      </div>
    </div>
  );
}

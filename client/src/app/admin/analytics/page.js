export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Review revenue, conversion rates, and sales trends</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
        <p className="text-gray-500 text-sm">Store performance graphs and conversion charts will be displayed here.</p>
      </div>
    </div>
  );
}


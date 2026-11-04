export default function AdminReviewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Moderate customer reviews and feedback on cosmetic products</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
        <p className="text-gray-500 text-sm">Customer feedback and ratings will be listed here.</p>
      </div>
    </div>
  );
}


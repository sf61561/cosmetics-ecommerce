import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchResultsView from "./SearchResultsView";

export const metadata = {
  title: "Search Results | Eloura Cosmetics & Skincare",
  description:
    "Search authentic Korean, Japanese, and international skincare and beauty essentials at Eloura.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF0F0]">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-gray-500">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
              <p className="mt-2">Loading search results...</p>
            </div>
          }
        >
          <SearchResultsView />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}


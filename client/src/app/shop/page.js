import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ShopView from "./ShopView";

export const metadata = {
  title: "Shop All Products | Eloura Cosmetics & Skincare",
  description:
    "Discover our complete collection of authentic Korean skincare, cosmetics, and beauty essentials at Eloura.",
};

export default function ShopPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF9] dark:bg-gray-950">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-gray-500">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9B4F5E] border-t-transparent" />
              <p className="mt-2">Loading products...</p>
            </div>
          }
        >
          <ShopView />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

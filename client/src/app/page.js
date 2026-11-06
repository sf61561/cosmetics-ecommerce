import HeroSlider from "@/components/home/HeroSlider";
import Navbar from "@/components/layout/Navbar";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";
import RecommendedProducts from "@/components/home/RecommendedProducts";
import CollectionsShowcase from "@/components/home/CollectionsShowcase";
import FeaturedBrandsShowcase from "@/components/home/FeaturedBrandsShowcase";
import Footer from "@/components/layout/Footer";
import AdminHomeRedirect from "@/components/layout/AdminHomeRedirect";

async function getHeroSlides() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/hero-sliders?placement=home_hero`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

async function getTopCollections() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/collections/top?limit=3`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

async function getNewArrivals() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/products/new-arrivals?limit=8`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

async function getTopBrands() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/brands/top?limit=3`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [heroSlides, topCollections, newArrivals, topBrands] = await Promise.all([
    getHeroSlides(),
    getTopCollections(),
    getNewArrivals(),
    getTopBrands(),
  ]);

  return (
    <AdminHomeRedirect>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <HeroSlider initialSlides={heroSlides} />
          <CollectionsShowcase initialCollections={topCollections} />
          <NewArrivalsSection initialProducts={newArrivals.slice(0, 4)} />
          <RecommendedProducts />
          <FeaturedBrandsShowcase initialBrands={topBrands} />
        </main>
        <Footer />
      </div>
    </AdminHomeRedirect>
  );
}

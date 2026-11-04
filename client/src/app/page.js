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

export default async function Home() {
  const heroSlides = await getHeroSlides();

  return (
    <AdminHomeRedirect>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <HeroSlider initialSlides={heroSlides} />
          <CollectionsShowcase />
          <NewArrivalsSection />
          <RecommendedProducts />
          <FeaturedBrandsShowcase />
        </main>
        <Footer />
      </div>
    </AdminHomeRedirect>
  );
}

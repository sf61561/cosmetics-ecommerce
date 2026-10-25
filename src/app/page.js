import HeroSlider from "@/components/home/HeroSlider";
import Navbar from "@/components/layout/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <HeroSlider />
    </div>
  );
}

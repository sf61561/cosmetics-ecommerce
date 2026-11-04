import HeroSliderEditPageClient from "./pageClient";

export default async function HeroSliderEditPage({ params }) {
  const { id } = await params;
  return <HeroSliderEditPageClient id={id} />;
}

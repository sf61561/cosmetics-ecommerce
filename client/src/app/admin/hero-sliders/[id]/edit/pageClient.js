"use client";

import { useEffect, useState } from "react";
import HeroSliderForm from "@/components/admin/HeroSliderForm";
import { heroSliderService } from "@/services/heroSliderService";

export default function HeroSliderEditPageClient({ id }) {
  const [slide, setSlide] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { heroSliderService.getById(id).then((response) => setSlide(response.data)).catch((requestError) => setError(requestError.message)); }, [id]);
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!slide) return <div className="py-12 text-center text-sm text-gray-500">Loading slide...</div>;
  return <HeroSliderForm initialSlide={slide} />;
}

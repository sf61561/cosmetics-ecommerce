
"use client";

import Link from "next/link";
import Image from "next/image";

import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Pagination,
  Autoplay,
  EffectFade,
} from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

const slides = [
  {
    id: 1,
    badge: "RupKotha",
    headline: "GLASS SKIN SECRETS",
    subheading: "Get Up To 20% OFF\nOn Best Sellers",
    description:
      "Authentic Korean Skincare Delivered To Your Doorstep",
    cta: "Shop Now",
    ctaLink: "/shop",
    imageUrl: "/images/slider/slider-1.png",
  },
  {
    id: 2,
    badge: "RupKotha",
    headline: "SUMMER GLOW UP",
    subheading: "Flat 30% OFF\nOn Sunscreen Range",
    description: "Protect & Nourish Your Skin This Season",
    cta: "Shop Now",
    ctaLink: "/shop?category=sunscreen",
    imageUrl: "/images/slider/slider-2.png",
  },
  {
    id: 3,
    badge: "RupKotha",
    headline: "NEW ARRIVALS",
    subheading: "Fresh Drops\nJust Landed",
    description: "Discover The Latest In K-Beauty & Skincare",
    cta: "Explore",
    ctaLink: "/new-arrivals",
    imageUrl: "/images/slider/slider-3.png",
  },
  {
    id: 4,
    badge: "RupKotha",
    headline: "BUNDLE & SAVE",
    subheading: "Buy 2 Get 1 Free\nOn All Serums",
    description: "Build Your Perfect Skincare Routine For Less",
    cta: "Shop Now",
    ctaLink: "/shop?category=serums",
    imageUrl: "/images/slider/slider-4.png",
  },
];

export default function HeroSlider() {
  return (
    <section className="relative w-full h-[calc(100vh-80px)]">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        className="w-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="relative h-[400px] w-full overflow-hidden sm:h-[500px] lg:h-[600px]">
              <Image
                src={slide.imageUrl}
                alt={slide.headline}
                fill
                sizes="100vw"
                priority={index <= 1}
                loading={index <= 1 ? "eager" : "lazy"}
                className="object-cover"
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-center text-white">
                <span className="text-sm uppercase tracking-widest">
                  {slide.badge}
                </span>

                <h2 className="mt-2 text-3xl font-bold md:text-5xl">
                  {slide.headline}
                </h2>

                <p className="mt-4 whitespace-pre-line text-lg md:text-2xl">
                  {slide.subheading}
                </p>

                <p className="mt-3 max-w-xl text-sm md:text-base">
                  {slide.description}
                </p>

                <Link
                  href={slide.ctaLink}
                  className="mt-6 rounded bg-teal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

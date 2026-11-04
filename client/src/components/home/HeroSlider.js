"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { heroSliderService } from "@/services/heroSliderService";
import { FaPause, FaPlay } from "react-icons/fa";

import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Pagination,
  Autoplay,
  EffectFade,
  Keyboard,
} from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

function getAlignment(alignment) {
  if (alignment === "center") return { items: "items-center", text: "text-center" };
  if (alignment === "right") return { items: "items-end", text: "text-right" };
  return { items: "items-start", text: "text-left" };
}

function getPosition(position) {
  if (position === "top") return "justify-start";
  if (position === "bottom") return "justify-end";
  return "justify-center";
}

export default function HeroSlider({ initialSlides = [] }) {
  const [slides, setSlides] = useState(initialSlides);
  const [isLoading, setIsLoading] = useState(initialSlides.length === 0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const swiperRef = useRef(null);

  useEffect(() => {
    let subscribed = true;
    heroSliderService
      .getPublic("home_hero")
      .then((response) => {
        if (subscribed && Array.isArray(response?.data) && response.data.length > 0) {
          setSlides(response.data);
        }
      })
      .catch((err) => {
        console.warn("Unable to fetch live hero slides:", err?.message || err);
      })
      .finally(() => {
        if (subscribed) setIsLoading(false);
      });

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(mediaQuery.matches);
    updateMotion();
    mediaQuery.addEventListener?.("change", updateMotion);

    // Pause autoplay when document tab is hidden
    const handleVisibilityChange = () => {
      if (!swiperRef.current) return;
      if (document.visibilityState === "hidden") {
        swiperRef.current.autoplay?.stop();
      } else if (!isPaused && !mediaQuery.matches) {
        swiperRef.current.autoplay?.start();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscribed = false;
      mediaQuery.removeEventListener?.("change", updateMotion);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused]);

  // If loading and no slides exist yet, display an elegant brand shimmer skeleton
  if (isLoading && slides.length === 0) {
    return (
      <section
        className="relative w-full h-[450px] sm:h-[550px] lg:h-[650px] overflow-hidden bg-gradient-to-r from-gray-100 via-[#FBF0F0]/60 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-pulse"
        aria-label="Loading hero banner"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-12 text-center">
          <div className="h-6 w-28 rounded-full bg-pink-200/50 dark:bg-pink-900/40 mb-3" />
          <div className="h-10 sm:h-14 w-3/4 max-w-lg rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 mb-3" />
          <div className="h-5 sm:h-7 w-1/2 max-w-sm rounded-xl bg-gray-200/60 dark:bg-gray-700/50 mb-6" />
          <div className="h-12 w-36 rounded-xl bg-[#9B4F5E]/20 dark:bg-[#9B4F5E]/30" />
        </div>
      </section>
    );
  }

  // If no active slides exist within schedule, hide the slider section cleanly
  if (!isLoading && slides.length === 0) return null;

  const isSingleSlide = slides.length === 1;

  const togglePlayPause = () => {
    if (!swiperRef.current) return;
    if (isPaused) {
      swiperRef.current.autoplay?.start();
      setIsPaused(false);
    } else {
      swiperRef.current.autoplay?.stop();
      setIsPaused(true);
    }
  };

  return (
    <section
      className="relative w-full h-[450px] sm:h-[550px] lg:h-[650px] overflow-hidden bg-gray-100"
      aria-label="Homepage Promotions & Hero Banners"
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        modules={[Navigation, Pagination, Autoplay, EffectFade, Keyboard]}
        slidesPerView={1}
        navigation={!isSingleSlide}
        pagination={!isSingleSlide ? { clickable: true } : false}
        keyboard={{ enabled: true }}
        autoplay={
          !isSingleSlide && !reducedMotion && !isPaused
            ? {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={!isSingleSlide}
        className="w-full h-full"
      >
        {slides.map((slide, index) => {
          const isLCP = index === 0;

          return (
            <SwiperSlide key={slide.id}>
              <div className="relative w-full h-full overflow-hidden">
                {/* Desktop and Mobile Responsive Images */}
                {slide.mobileImageUrl ? (
                  <picture
                    className="relative block w-full h-full"
                    style={{ position: "relative", display: "block", width: "100%", height: "100%" }}
                  >
                    <source media="(max-width: 768px)" srcSet={slide.mobileImageUrl} />
                    <Image
                      src={slide.desktopImageUrl}
                      alt={slide.altText || slide.headline || "Eloura Hero Banner"}
                      fill
                      sizes="100vw"
                      priority={isLCP}
                      loading={isLCP ? "eager" : "lazy"}
                      className="object-cover"
                    />
                  </picture>
                ) : (
                  <Image
                    src={slide.desktopImageUrl}
                    alt={slide.altText || slide.headline || "Eloura Hero Banner"}
                    fill
                    sizes="100vw"
                    priority={isLCP}
                    loading={isLCP ? "eager" : "lazy"}
                    className="object-cover"
                  />
                )}

                {/* Text and Button Overlay */}
                <div
                  className={`absolute inset-0 flex flex-col ${getPosition(
                    slide.textPosition
                  )} ${getAlignment(slide.textAlignment).items} p-6 sm:p-12 lg:p-20 ${
                    getAlignment(slide.textAlignment).text
                  } ${slide.textColor === "dark" ? "text-gray-900" : "text-white"}`}
                  style={{ backgroundColor: `rgba(0,0,0,${slide.overlayOpacity})` }}
                >
                  <div className="max-w-2xl">
                    {slide.badgeText && (
                      <span className="inline-block rounded-full bg-[#9B4F5E]/90 text-white px-3 py-1 text-xs uppercase font-bold tracking-widest shadow-2xs mb-2">
                        {slide.badgeText}
                      </span>
                    )}

                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                      {slide.headline}
                    </h2>

                    {slide.subtitle && (
                      <p className="mt-3 sm:mt-4 whitespace-pre-line text-sm sm:text-lg lg:text-xl opacity-90 max-w-xl">
                        {slide.subtitle}
                      </p>
                    )}

                    {slide.buttonText && slide.buttonLink && (
                      <div className="mt-6 sm:mt-8">
                        <Link
                          href={slide.buttonLink}
                          target={slide.openInNewTab ? "_blank" : undefined}
                          rel={slide.openInNewTab ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#9B4F5E] px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md hover:bg-[#853F4D] transition-transform active:scale-95"
                        >
                          {slide.buttonText}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Accessible Autoplay Pause/Play Control (Hidden if only 1 slide) */}
      {!isSingleSlide && (
        <button
          type="button"
          onClick={togglePlayPause}
          className="absolute bottom-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors cursor-pointer"
          aria-label={isPaused ? "Resume slider autoplay" : "Pause slider autoplay"}
        >
          {isPaused ? <FaPlay className="h-3 w-3 ml-0.5" /> : <FaPause className="h-3 w-3" />}
        </button>
      )}
    </section>
  );
}

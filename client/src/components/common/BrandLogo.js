"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * BrandLogo Component
 * Prioritizes the uploaded brand logo image (Cloudinary or local URL).
 * Falls back to stylized brand wordmarks or typography if no image is present.
 */
export default function BrandLogo({ brand, className = "", imageClassName = "" }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = brand?.logoUrl || brand?.logo_url || brand?.imageUrl || brand?.image_url;
  const slug = (brand?.slug || "").toLowerCase().trim();
  const name = brand?.name || "Brand";

  // 1. Primary: If brand has an uploaded logo image, render it
  if (logoUrl && !imgError) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative h-12 sm:h-14 w-36 sm:w-44 flex items-center justify-center">
          <Image
            src={logoUrl}
            alt={name}
            fill
            sizes="176px"
            className={`object-contain transition-transform duration-300 group-hover:scale-105 ${imageClassName}`}
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  // 2. Stylized typography fallbacks when no logo image is uploaded
  // Beauty of Joseon
  if (slug === "beauty-of-joseon") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="relative mb-1 flex items-center justify-center">
          <svg
            className="h-10 w-10 text-gray-900 dark:text-gray-100"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M48 10 C46 15, 42 28, 40 38 C39 42, 45 40, 52 38 C56 36, 58 35, 60 40 C62 46, 55 50, 48 52 C42 54, 38 62, 36 75 C35 82, 38 88, 44 88 C48 88, 52 82, 55 70 C56 66, 62 68, 60 74 C56 86, 48 94, 40 94 C30 94, 25 84, 27 72 C29 58, 35 48, 41 44 C45 42, 46 38, 48 28 C50 16, 52 10, 48 10 Z" />
            <path d="M58 20 C64 22, 68 28, 66 34 C64 38, 60 36, 58 32 C56 26, 54 22, 58 20 Z" />
            <circle cx="76" cy="42" r="5" fill="#DC2626" />
          </svg>
        </div>
        <span className="font-serif text-sm tracking-wide text-gray-800 dark:text-gray-200">
          Beauty of Joseon
        </span>
      </div>
    );
  }

  // COSRX
  if (slug === "cosrx") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
          COSRX
        </span>
      </div>
    );
  }

  // Anua
  if (slug === "anua") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative inline-flex items-center">
          <span className="font-serif text-2xl sm:text-3xl font-normal text-gray-900 dark:text-gray-100 tracking-normal">
            Anua
          </span>
          <svg
            className="absolute -top-2.5 -right-3 h-4 w-4 text-emerald-700/80 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C8 6 6 11 8 16C9 18 11 20 12 22C13 20 15 18 16 16C18 11 16 6 12 2M12 6C13.5 9 14 12 13 15C12.5 14 11.5 14 11 15C10 12 10.5 9 12 6Z" />
          </svg>
        </div>
      </div>
    );
  }

  // SKIN1004
  if (slug === "skin1004") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-sans text-xl sm:text-2xl font-bold tracking-[0.2em] text-gray-900 dark:text-gray-100 uppercase">
          SKIN1004
        </span>
      </div>
    );
  }

  // Sulwhasoo
  if (slug === "sulwhasoo") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-wide text-gray-950 dark:text-white">
          Sulwhasoo
        </span>
      </div>
    );
  }

  // ROUND LAB
  if (slug === "round-lab") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-sans text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 uppercase">
          ROUND LAB
        </span>
      </div>
    );
  }

  // Isntree
  if (slug === "isntree") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative inline-flex items-center">
          <span className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-gray-900 dark:text-gray-100">
            isntree
          </span>
          <svg
            className="ml-1 h-4 w-4 text-emerald-600 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
        </div>
      </div>
    );
  }

  // iUNIK
  if (slug === "iunik") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="inline-flex items-center gap-0.5">
          <span className="text-emerald-600 dark:text-emerald-400 font-sans text-2xl sm:text-3xl font-bold">
            i
          </span>
          <span className="font-sans text-2xl sm:text-3xl font-black tracking-wide text-gray-900 dark:text-gray-100 uppercase">
            UNIK
          </span>
        </div>
      </div>
    );
  }

  // Laneige
  if (slug === "laneige") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-serif text-2xl sm:text-3xl font-light tracking-wide text-gray-900 dark:text-gray-100 lowercase">
          laneige
        </span>
      </div>
    );
  }

  // MISSHA
  if (slug === "missha") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-sans text-2xl sm:text-3xl font-bold tracking-[0.25em] text-gray-950 dark:text-white uppercase">
          MISSHA
        </span>
      </div>
    );
  }

  // SOME BY MI
  if (slug === "some-by-mi") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-serif text-xl sm:text-2xl font-black tracking-wider text-gray-900 dark:text-gray-100 uppercase">
          SOME BY MI
        </span>
      </div>
    );
  }

  // the lab by blanc doux
  if (slug === "the-lab-by-blanc-doux") {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        <span className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight lowercase">
          the lab
        </span>
        <span className="font-sans text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-widest lowercase -mt-0.5">
          by blanc doux
        </span>
      </div>
    );
  }

  // Default fallback: Clean typography
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="font-serif text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-wide">
        {name}
      </span>
    </div>
  );
}

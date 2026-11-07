"use client";

import Image from "next/image";
import { FaTimes } from "react-icons/fa";

export default function ReviewLightboxModal({
  isOpen = false,
  onClose = () => {},
  imageUrl = "",
}) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[90vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer"
          aria-label="Close image"
        >
          <FaTimes className="h-5 w-5" />
        </button>

        <div className="relative w-full aspect-square max-h-[80vh] overflow-hidden rounded-2xl bg-black">
          <Image
            src={imageUrl}
            alt="Customer review image full size"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        </div>
      </div>
    </div>
  );
}


"use client";

import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart } from "react-icons/fa";

export default function WishlistButton({
  productId,
  variantId = null,
  className = "",
  size = "md",
  ariaLabel,
}) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(productId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId) return;
    toggleWishlist(productId, variantId);
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const buttonSizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={handleClick}
      aria-label={ariaLabel || (wishlisted ? "Remove from wishlist" : "Add to wishlist")}
      title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      className={`flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shadow-xs ${
        buttonSizes[size] || buttonSizes.md
      } ${
        wishlisted
          ? "bg-white/95 text-red-500 hover:scale-110 active:scale-95 shadow-md"
          : "bg-white/90 text-gray-500 hover:text-red-500 hover:scale-110 active:scale-95 hover:bg-white"
      } ${className}`}
    >
      {wishlisted ? (
        <FaHeart className={iconSizes[size] || iconSizes.md} />
      ) : (
        <FaRegHeart className={iconSizes[size] || iconSizes.md} />
      )}
    </button>
  );
}


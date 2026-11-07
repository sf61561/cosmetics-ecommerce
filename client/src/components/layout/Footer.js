"use client";

import Link from "next/link";
import { useState } from "react";
import { useProductRequest } from "@/context/ProductRequestContext";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaPinterestP,
} from "react-icons/fa";

export default function Footer() {
  const { openProductRequest } = useProductRequest();

  return (
    <footer className="w-full bg-[#FAF7F5] border-t border-[#F2E8E6] text-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center group">
              <span className="font-logo text-2xl tracking-[0.24em] font-semibold text-gray-900 group-hover:text-[#9B4F5E] transition-colors">
                ELOURÁ
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm">
              Discover the secrets of authentic Korean beauty with our handpicked skincare and cosmetics, specially curated for South Asian skin and tropical climates.
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-[#9B4F5E] hover:text-white hover:border-[#9B4F5E] transition-all shadow-2xs"
              >
                <FaFacebookF className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-[#9B4F5E] hover:text-white hover:border-[#9B4F5E] transition-all shadow-2xs"
              >
                <FaInstagram className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-[#9B4F5E] hover:text-white hover:border-[#9B4F5E] transition-all shadow-2xs"
              >
                <FaYoutube className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-[#9B4F5E] hover:text-white hover:border-[#9B4F5E] transition-all shadow-2xs"
              >
                <FaPinterestP className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-gray-900 uppercase">
              Shop
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>
                <Link href="/collections" className="hover:text-[#9B4F5E] transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-[#9B4F5E] transition-colors">
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link href="/new-arrivals" className="hover:text-[#9B4F5E] transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/brands" className="hover:text-[#9B4F5E] transition-colors">
                  Brands
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-gray-900 uppercase">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>
                <button
                  type="button"
                  onClick={() => openProductRequest()}
                  className="hover:text-[#9B4F5E] transition-colors text-left cursor-pointer font-medium text-[#9B4F5E]"
                >
                  Request a Product ✿
                </button>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-[#9B4F5E] transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#9B4F5E] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#faqs" className="hover:text-[#9B4F5E] transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#shipping" className="hover:text-[#9B4F5E] transition-colors">
                  Shipping & Delivery
                </a>
              </li>
              <li>
                <a href="#returns" className="hover:text-[#9B4F5E] transition-colors">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <a href="#guide" className="hover:text-[#9B4F5E] transition-colors">
                  Care Guide
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="mt-12 pt-6 border-t border-[#F2E8E6] flex items-center justify-center">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Elourá. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}


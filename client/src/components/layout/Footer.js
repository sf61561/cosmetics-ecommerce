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
            <Link href="/" className="inline-flex items-center gap-2 group">
              <span className="font-serif text-2xl tracking-tight text-gray-900 group-hover:text-[#9B4F5E] transition-colors">
                Eloura
              </span>
              <span className="text-[#A582B4] text-lg font-serif">✿</span>
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
                <Link href="/products" className="hover:text-[#9B4F5E] transition-colors">
                  Best Sellers
                </Link>
              </li>
              <li>
                <Link href="/products?status=active" className="hover:text-[#9B4F5E] transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/collections/hydration-and-glow" className="hover:text-[#9B4F5E] transition-colors">
                  Skin Care
                </Link>
              </li>
              <li>
                <Link href="/brands" className="hover:text-[#9B4F5E] transition-colors">
                  Brands
                </Link>
              </li>
              <li>
                <Link href="/collections/bridal-radiance-glow" className="hover:text-[#9B4F5E] transition-colors">
                  Gift Sets
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
                  Track My Order
                </Link>
              </li>
              <li>
                <a href="#support" className="hover:text-[#9B4F5E] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#faqs" className="hover:text-[#9B4F5E] transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#9B4F5E] transition-colors">
                  Track Your Order
                </Link>
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

            <div className="pt-3 text-[11px] text-gray-500 space-y-1 border-t border-gray-100">
              <p>Email: <span className="text-gray-700">hello@eloura.com</span></p>
              <p>WhatsApp: <span className="text-gray-700">+880 1234-567890</span></p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="mt-12 pt-6 border-t border-[#F2E8E6] flex items-center justify-center">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Eloura. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}


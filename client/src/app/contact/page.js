import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  IoCallOutline,
  IoMailOutline,
  IoLocationOutline,
  IoTimeOutline,
} from "react-icons/io5";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaPinterestP,
} from "react-icons/fa";

export const metadata = {
  title: "Contact Us | Elourá",
  description:
    "Get in touch with Elourá for any questions, product inquiries, or customer support. We're here to assist you.",
};

const CONTACT_DETAILS = [
  {
    icon: IoCallOutline,
    label: "Phone & WhatsApp",
    value: "+880 1700-000000",
    href: "tel:+8801700000000",
    description: "Sat – Thu, 10:00 AM – 8:00 PM (tap to call)",
  },
  {
    icon: IoMailOutline,
    label: "Email Support",
    value: "support@elouraa.me",
    href: "mailto:support@elouraa.me",
    description: "We reply within 24 hours (tap to email)",
  },
  {
    icon: IoLocationOutline,
    label: "Store & Office Location",
    value: "House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh",
    href: "https://maps.google.com/?q=Dhanmondi+Dhaka+Bangladesh",
    target: "_blank",
    description: "Store visits & pickups welcome",
  },
  {
    icon: IoTimeOutline,
    label: "Operating Hours",
    value: "Sat – Thu: 10:00 AM – 8:00 PM",
    description: "Friday: Closed (Storefront orders open 24/7)",
  },
];

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    icon: FaFacebookF,
    href: "https://facebook.com",
  },
  {
    name: "Instagram",
    icon: FaInstagram,
    href: "https://instagram.com",
  },
  {
    name: "YouTube",
    icon: FaYoutube,
    href: "https://youtube.com",
  },
  {
    name: "Pinterest",
    icon: FaPinterestP,
    href: "https://pinterest.com",
  },
];

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F5] dark:bg-gray-950 text-gray-800 dark:text-gray-100">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* ── Breadcrumb ── */}
          <nav
            className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-6"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors"
            >
              Home
            </Link>
            <span className="mx-2 text-gray-300 dark:text-gray-600">›</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Contact Us
            </span>
          </nav>

          {/* ── Header ── */}
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14 space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-gray-900 dark:text-white">
              Contact Us
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              We&apos;d love to hear from you. Reach out through any of our direct
              support channels below.
            </p>
          </div>

          {/* ── 2x2 Grid of Contact Cards (Stacked on Mobile) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
            {CONTACT_DETAILS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#F2E8E6] dark:border-gray-800 bg-white dark:bg-gray-900/90 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow duration-200 flex items-start gap-4"
                >
                  {/* Icon badge */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FAF0F2] dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300">
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Detail text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                      {item.label}
                    </p>

                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.target || undefined}
                        rel={
                          item.target === "_blank"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white hover:text-[#9B4F5E] dark:hover:text-pink-400 transition-colors break-words block leading-snug"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug">
                        {item.value}
                      </p>
                    )}

                    {item.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Social Channels ── */}
          <div className="rounded-2xl border border-[#F2E8E6] dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-6 text-center max-w-xl mx-auto shadow-2xs">
            <h3 className="text-xs font-bold tracking-wider uppercase text-gray-600 dark:text-gray-400 mb-4">
              Connect With Us Online
            </h3>
            <div className="flex items-center justify-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-[#9B4F5E] hover:text-white hover:border-[#9B4F5E] transition-all shadow-2xs"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

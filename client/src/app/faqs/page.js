import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FaqsView from "./FaqsView";
import { FAQ_DATA } from "./faqData";

export const metadata = {
  title: "Frequently Asked Questions | Elourá",
  description:
    "Find answers to common questions about product authenticity, shipping, delivery timelines, unboxing, returns, and product requests at Elourá.",
};

export default function FaqsPage() {
  // Schema.org FAQPage JSON-LD structured data for Google Search rich snippets
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_DATA.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F5] dark:bg-gray-950">
      {/* ── JSON-LD Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Navbar />

      <main className="flex-1">
        <FaqsView />
      </main>

      <Footer />
    </div>
  );
}

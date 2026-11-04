const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { query } = require("../config/db");

const sampleBrands = [
  {
    name: "The Ordinary",
    slug: "the-ordinary",
    description: "Clinical formulations with integrity. Pioneering transparent, functional skincare powered by active ingredients at accessible price points.",
    logoUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/the-ordinary",
    websiteUrl: "https://theordinary.com",
    isActive: true,
    isFeatured: true,
  },
  {
    name: "COSRX",
    slug: "cosrx",
    description: "Renowned Korean derm-cosmetic brand focusing on gentle, skin-friendly ingredients like snail mucin, propolis, and BHA to soothe sensitive complexions.",
    logoUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/cosrx",
    websiteUrl: "https://www.cosrx.com",
    isActive: true,
    isFeatured: true,
  },
  {
    name: "CeraVe",
    slug: "cerave",
    description: "Dermatologist-developed skincare formulated with three essential ceramides and MVE delivery technology to restore the natural protective barrier.",
    logoUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/cerave",
    websiteUrl: "https://www.cerave.com",
    isActive: true,
    isFeatured: true,
  },
  {
    name: "Hada Labo",
    slug: "hada-labo",
    description: "Japanese cult skincare line centered on ultimate skin hydration through multiple molecular weights of hyaluronic acid with zero unnecessary additives.",
    logoUrl: "https://images.unsplash.com/photo-1608248597359-577778b0e797?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/hada-labo",
    websiteUrl: "https://hadalabotokyo.com",
    isActive: true,
    isFeatured: false,
  },
  {
    name: "Minimalist",
    slug: "minimalist",
    description: "Efficacy-first scientific formulations addressing pigmentation, acne, and aging with clinically verified active ingredient percentages.",
    logoUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/minimalist",
    websiteUrl: "https://beminimalist.co",
    isActive: true,
    isFeatured: false,
  },
  {
    name: "Focallure",
    slug: "focallure",
    description: "Trendy, playful, and budget-friendly beauty cosmetics featuring pigmented eyeshadow palettes, velvet tints, and long-wear foundations.",
    logoUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&auto=format&fit=crop&q=80",
    logoPublicId: "seed/brands/focallure",
    websiteUrl: "https://focallure.com",
    isActive: false, // Inactive brand for filter testing
    isFeatured: false,
  },
];

async function seed() {
  console.log("Seeding sample brands into RupKotha database...");
  try {
    for (const b of sampleBrands) {
      await query(
        `INSERT INTO brands (name, slug, description, logo_url, logo_public_id, website_url, is_active, is_featured, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE 
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             logo_url = EXCLUDED.logo_url,
             logo_public_id = EXCLUDED.logo_public_id,
             website_url = EXCLUDED.website_url,
             is_active = EXCLUDED.is_active,
             is_featured = EXCLUDED.is_featured,
             updated_at = NOW();`,
        [b.name, b.slug, b.description, b.logoUrl, b.logoPublicId, b.websiteUrl, b.isActive, b.isFeatured]
      );
      console.log(`✓ Seeded brand: ${b.name} (${b.slug}) [Active: ${b.isActive}, Featured: ${b.isFeatured}]`);
    }
    console.log("Sample brands seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();


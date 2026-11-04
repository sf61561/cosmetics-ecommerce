const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { query } = require("../config/db");

const brands = [
  {
    name: "Beauty of Joseon",
    slug: "beauty-of-joseon",
    tagline: "Traditional Hanbang Heritage",
    description: "Modern interpretations of traditional Korean herbal medicine (Hanbang) rituals crafted with dynasty secrets.",
    logoUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://beautyofjoseon.com",
    isActive: true,
    isFeatured: true,
    salesCount: 3450,
  },
  {
    name: "COSRX",
    slug: "cosrx",
    tagline: "Gentle & Effective Solutions",
    description: "Science-backed dermatological formulations focusing on minimal ingredients with maximum efficacy for sensitive and acne-prone skin.",
    logoUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.cosrx.com",
    isActive: true,
    isFeatured: true,
    salesCount: 2980,
  },
  {
    name: "Anua",
    slug: "anua",
    tagline: "Soothing Naturalism",
    description: "Pure botanical Korean skincare dedicated to skin relaxation, featuring heartleaf and peach niacin soothing concentrates.",
    logoUrl: "https://images.unsplash.com/photo-1608248597359-577778b0e797?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://anua.com",
    isActive: true,
    isFeatured: true,
    salesCount: 2650,
  },
  {
    name: "SKIN1004",
    slug: "skin1004",
    tagline: "Madagascar Centella Specialists",
    description: "Untouched nature from Madagascar, sourcing the purest Centella Asiatica for calming and healing delicate skin barriers.",
    logoUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://skin1004.com",
    isActive: true,
    isFeatured: true,
    salesCount: 1890,
  },
  {
    name: "Sulwhasoo",
    slug: "sulwhasoo",
    tagline: "Ginseng Science & Heritage",
    description: "Timeless luxury Korean skincare harnessing decades of ginseng biotechnology for ageless radiance and balance.",
    logoUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.sulwhasoo.com",
    isActive: true,
    isFeatured: true,
    salesCount: 1540,
  },
  {
    name: "ROUND LAB",
    slug: "round-lab",
    tagline: "Natural Ingredients from Korea's Land & Seas",
    description: "Mineral-rich deep sea water from Dokdo Island and inje birch tree sap delivering pure, non-irritating hydration.",
    logoUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://roundlab.com",
    isActive: true,
    isFeatured: true,
    salesCount: 1210,
  },
  {
    name: "Isntree",
    slug: "isntree",
    tagline: "Natural Ingredients & Clear Skin",
    description: "Clean functional skincare formulated with green tea, hyaluronic acid, and mugwort to nurture healthy skin.",
    logoUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://isntree.com",
    isActive: true,
    isFeatured: false,
    salesCount: 980,
  },
  {
    name: "iUNIK",
    slug: "iunik",
    tagline: "Minimalism for Skin & Lifestyle",
    description: "Hypoallergenic skincare driven by natural botanical ingredients like tea tree, propolis, and beta-glucan.",
    logoUrl: "https://images.unsplash.com/photo-1608248597359-577778b0e797?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.iunikcos.com",
    isActive: true,
    isFeatured: false,
    salesCount: 850,
  },
  {
    name: "Laneige",
    slug: "laneige",
    tagline: "Water Science & Intensive Hydration",
    description: "Advanced water science and sleep-care masks designed to lock in moisture and amplify morning glow.",
    logoUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.laneige.com",
    isActive: true,
    isFeatured: false,
    salesCount: 790,
  },
  {
    name: "MISSHA",
    slug: "missha",
    tagline: "Inward and Outward Glow",
    description: "Pioneers of affordable K-Beauty luxury, known worldwide for revolutionary fermented essences and BB creams.",
    logoUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://missha.com",
    isActive: true,
    isFeatured: false,
    salesCount: 640,
  },
  {
    name: "SOME BY MI",
    slug: "some-by-mi",
    tagline: "Brightening & Acne Solutions",
    description: "Targeted problem-solving formulas including the viral 30-day miracle AHA BHA PHA line and yuja niacin.",
    logoUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://somebymi.com",
    isActive: true,
    isFeatured: false,
    salesCount: 520,
  },
  {
    name: "the lab by blanc doux",
    slug: "the-lab-by-blanc-doux",
    tagline: "Intense Moisture & Sensitive Skin",
    description: "Oligo-hyaluronic acid specialists providing low-molecular moisture that penetrates deep into parched skin layers.",
    logoUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&auto=format&fit=crop&q=80",
    websiteUrl: "https://thelabbyblancdoux.com",
    isActive: true,
    isFeatured: false,
    salesCount: 410,
  },
];

async function runMigrationAndSeed() {
  console.log("1. Migrating brands table schema...");
  await query(`
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS sales_count INT NOT NULL DEFAULT 0;
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_brands_sales_count ON brands (sales_count DESC, name ASC);
  `);
  console.log("   Brands schema updated with sales_count, tagline, and index.");

  console.log("2. Seeding / updating storefront brands...");
  for (const b of brands) {
    await query(
      `INSERT INTO brands (name, slug, tagline, description, logo_url, website_url, is_active, is_featured, sales_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         tagline = EXCLUDED.tagline,
         description = EXCLUDED.description,
         logo_url = COALESCE(brands.logo_url, EXCLUDED.logo_url),
         website_url = EXCLUDED.website_url,
         is_active = EXCLUDED.is_active,
         is_featured = EXCLUDED.is_featured,
         sales_count = EXCLUDED.sales_count,
         updated_at = NOW();`,
      [
        b.name,
        b.slug,
        b.tagline,
        b.description,
        b.logoUrl,
        b.websiteUrl,
        b.isActive,
        b.isFeatured,
        b.salesCount,
      ]
    );
    console.log(`   Processed brand: ${b.name} (${b.salesCount} sales)`);
  }

  console.log("3. Verifying top 3 brands ordered by sales_count DESC, name ASC...");
  const topRes = await query(`
    SELECT name, slug, tagline, sales_count 
    FROM brands 
    WHERE is_active = true 
    ORDER BY sales_count DESC, name ASC 
    LIMIT 3;
  `);
  console.log("Top 3 brands in database:", topRes.rows);

  console.log("Done!");
  process.exit(0);
}

runMigrationAndSeed().catch((err) => {
  console.error("Migration/seed failed:", err);
  process.exit(1);
});


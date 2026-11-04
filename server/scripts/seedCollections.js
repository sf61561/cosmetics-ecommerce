const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { query } = require("../config/db");

const sampleCollections = [
  {
    name: "Bridal Radiance Glow",
    slug: "bridal-radiance-glow",
    description: "Curated skincare and illuminating makeup formulations specifically crafted for traditional South Asian bridal celebrations and pre-wedding glow rituals.",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/bridal-radiance-glow",
    isActive: true,
  },
  {
    name: "Rose Hydration Series",
    slug: "rose-hydration-series",
    description: "Infused with pure organic Damask rose water and multi-molecular hyaluronic acid to deeply replenish dry, dehydrated skin in tropical climates.",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/rose-hydration-series",
    isActive: true,
  },
  {
    name: "Ayurvedic Herbal Skincare",
    slug: "ayurvedic-herbal-skincare",
    description: "Centuries-old botanical wisdom harnessing turmeric, sandalwood, neem, and saffron for calm, blemish-free, luminous skin tone.",
    imageUrl: "https://images.unsplash.com/photo-1608248597359-577778b0e797?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/ayurvedic-herbal-skincare",
    isActive: true,
  },
  {
    name: "Velvet Matte Luxe",
    slug: "velvet-matte-luxe",
    description: "Long-wearing lip pigments and silky pore-blurring face compacts formulated for non-drying all-day comfort and high humidity resistance.",
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/velvet-matte-luxe",
    isActive: true,
  },
  {
    name: "Vitamin C Brightening Line",
    slug: "vitamin-c-brightening-line",
    description: "Potent 15% ethyl ascorbic acid with ferulic acid targeted at stubborn post-acne dark spots, sun damage, and uneven pigmentation.",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/vitamin-c-brightening-line",
    isActive: false, // Intentionally inactive to test inactive filter & badge
  },
];

async function seed() {
  console.log("Seeding sample collections into Eloura database...");
  try {
    for (const col of sampleCollections) {
      await query(
        `INSERT INTO collections (name, slug, description, image_url, image_public_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE 
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             image_url = EXCLUDED.image_url,
             image_public_id = EXCLUDED.image_public_id,
             is_active = EXCLUDED.is_active,
             updated_at = NOW();`,
        [col.name, col.slug, col.description, col.imageUrl, col.imagePublicId, col.isActive]
      );
      console.log(`✓ Seeded: ${col.name} (${col.slug}) [Active: ${col.isActive}]`);
    }
    console.log("Sample collections seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();


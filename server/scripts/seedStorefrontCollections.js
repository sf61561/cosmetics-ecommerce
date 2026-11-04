const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { query } = require("../config/db");

const collections = [
  {
    name: "Hydration & Glow",
    slug: "hydration-and-glow",
    description: "Deeply quenching multi-molecular hyaluronic acid, fermented essences, and brightening serums for dewy, glass-like luminosity.",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/hydration-and-glow",
    isActive: true,
    salesCount: 2450,
    isFeatured: true,
    displayOrder: 1,
  },
  {
    name: "Calm & Soothe",
    slug: "calm-and-soothe",
    description: "Centella Asiatica (Cica), heartleaf, mugwort, and soothing green tea infusions to calm irritated, redness-prone skin barriers.",
    imageUrl: "https://images.unsplash.com/photo-1608248597359-577778b0e797?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/calm-and-soothe",
    isActive: true,
    salesCount: 1890,
    isFeatured: true,
    displayOrder: 2,
  },
  {
    name: "Age Defying",
    slug: "age-defying",
    description: "Potent Korean red ginseng, multi-peptide complexes, adenosine, and retinol alternatives to firm and restore youthfulness.",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/age-defying",
    isActive: true,
    salesCount: 1420,
    isFeatured: true,
    displayOrder: 3,
  },
  {
    name: "Clear & Balanced",
    slug: "clear-and-balanced",
    description: "Gentle BHA exfoliating toners, niacinamide treatments, and lightweight balancing emulsions for blemish-free clarity.",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/clear-and-balanced",
    isActive: true,
    salesCount: 980,
    isFeatured: false,
    displayOrder: 4,
  },
  {
    name: "Bridal Radiance Glow",
    slug: "bridal-radiance-glow",
    description: "Curated skincare and illuminating makeup formulations specifically crafted for traditional South Asian bridal celebrations and pre-wedding glow rituals.",
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/bridal-radiance-glow",
    isActive: true,
    salesCount: 750,
    isFeatured: false,
    displayOrder: 5,
  },
  {
    name: "Sun Protection",
    slug: "sun-protection",
    description: "High-efficacy, broad-spectrum SPF 50+ PA++++ chemical and mineral sunscreens that absorb weightlessly with zero white cast.",
    imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80",
    imagePublicId: "seed/sun-protection",
    isActive: true,
    salesCount: 610,
    isFeatured: false,
    displayOrder: 6,
  },
];

async function seedCollections() {
  console.log("Seeding / updating storefront collections...");
  for (const c of collections) {
    await query(
      `INSERT INTO collections (name, slug, description, image_url, image_public_id, is_active, sales_count, is_featured, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         image_url = EXCLUDED.image_url,
         image_public_id = EXCLUDED.image_public_id,
         is_active = EXCLUDED.is_active,
         sales_count = EXCLUDED.sales_count,
         is_featured = EXCLUDED.is_featured,
         display_order = EXCLUDED.display_order,
         updated_at = NOW();`,
      [
        c.name,
        c.slug,
        c.description,
        c.imageUrl,
        c.imagePublicId,
        c.isActive,
        c.salesCount,
        c.isFeatured,
        c.displayOrder,
      ]
    );
  }

  // Also associate existing products with these collections if available
  const prods = await query("SELECT id, name FROM products LIMIT 6;");
  const cols = await query("SELECT id, slug FROM collections;");

  if (prods.rows.length > 0 && cols.rows.length > 0) {
    const colMap = {};
    cols.rows.forEach((r) => {
      colMap[r.slug] = r.id;
    });

    for (let i = 0; i < prods.rows.length; i++) {
      const prodId = prods.rows[i].id;
      const targetColId = cols.rows[i % cols.rows.length].id;
      await query(
        `INSERT INTO product_collections (product_id, collection_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, collection_id) DO NOTHING;`,
        [prodId, targetColId]
      );
    }
  }

  console.log("Storefront collections successfully synced.");
}

seedCollections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });


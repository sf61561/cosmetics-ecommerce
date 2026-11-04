require("dotenv").config({ path: __dirname + "/../.env" });
const { getClient } = require("../config/db");

async function seedProducts() {
  console.log("=== SEEDING CATEGORIES & PRODUCTS ===");

  const client = await getClient();
  try {
    await client.query("BEGIN");

    // 1. Seed Categories
    const categoriesData = [
      {
        name: "Cleansers",
        slug: "cleansers",
        description: "Gentle oil cleansers, foaming face washes, and hydrating gel cleansers.",
        displayOrder: 1,
      },
      {
        name: "Toners & Mists",
        slug: "toners-mists",
        description: "Hydrating prep lotions, balancing toners, and soothing facial mists.",
        displayOrder: 2,
      },
      {
        name: "Serums & Ampoules",
        slug: "serums-ampoules",
        description: "Targeted actives, brightening serums, and concentrated skin boosters.",
        displayOrder: 3,
      },
      {
        name: "Moisturizers & Creams",
        slug: "moisturizers-creams",
        description: "Barrier repair creams, lightweight gel moisturizers, and night creams.",
        displayOrder: 4,
      },
      {
        name: "Sunscreens",
        slug: "sunscreens",
        description: "Broad-spectrum SPF 50+ PA++++ chemical and mineral sunscreens.",
        displayOrder: 5,
      },
      {
        name: "Eye & Lip Care",
        slug: "eye-lip-care",
        description: "Dark circle eye creams, nourishing lip tints, and sleeping masks.",
        displayOrder: 6,
      },
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, slug, description, display_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE 
         SET name = EXCLUDED.name, description = EXCLUDED.description, display_order = EXCLUDED.display_order
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description, cat.displayOrder]
      );
      categoryMap[cat.slug] = res.rows[0].id;
    }
    console.log(" Categories seeded successfully:", Object.keys(categoryMap).length);

    // Get Brand IDs
    const brandsRes = await client.query("SELECT id, slug FROM brands");
    const brandMap = {};
    brandsRes.rows.forEach(b => {
      brandMap[b.slug] = b.id;
    });

    // Get Collection IDs
    const collectionsRes = await client.query("SELECT id, slug FROM collections");
    const collectionMap = {};
    collectionsRes.rows.forEach(c => {
      collectionMap[c.slug] = c.id;
    });

    // 2. Seed Products
    const productsData = [
      {
        name: "COSRX Advanced Snail 96 Mucin Power Essence",
        slug: "cosrx-advanced-snail-96-mucin-power-essence",
        brandSlug: "cosrx",
        categorySlug: "serums-ampoules",
        sku: "COS-SN-96-100",
        barcode: "8809416470009",
        shortDescription: "Cult-favorite hydrating essence enriched with 96.3% snail secretion filtrate for plump, glowing skin.",
        description: "COSRX Advanced Snail 96 Mucin Power Essence delivers intense hydration and repairs damaged skin barrier. Formulated with 96.3% Snail Secretion Filtrate, this lightweight essence penetrates deep into the dermis to revitalize dull, tired skin, fade post-breakout dark spots, and improve skin elasticity without clogging pores.",
        price: 1650.00,
        salePrice: 1450.00,
        costPrice: 950.00,
        stockQuantity: 28,
        lowStockThreshold: 5,
        trackInventory: true,
        status: "ACTIVE",
        isFeatured: true,
        volume: "100ml",
        skinType: "All Skin Types, Sensitive, Dehydrated",
        skinConcerns: "Dryness, Dullness, Uneven Texture, Barrier Repair",
        ingredients: "Snail Secretion Filtrate, Betaine, Butylene Glycol, 1,2-Hexanediol, Sodium Polyacrylate, Phenoxyethanol, Sodium Hyaluronate, Allantoin, Carbomer, Panthenol, Arginine",
        countryOfOrigin: "South Korea",
        howToUse: "After cleansing and toning, apply a small amount to your entire face. Gently pat using fingertips to aid absorption, and follow with moisturizer.",
        expiryInfo: "12M PAO / Exp: 2027-11",
        seoTitle: "COSRX Advanced Snail 96 Mucin Power Essence 100ml | Eloura Bangladesh",
        seoDescription: "Buy authentic COSRX Snail 96 Mucin Essence in Bangladesh at Eloura. Genuine K-Beauty with fast home delivery and cash on delivery.",
        collections: ["glass-skin-essentials", "hydration-heroes"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
          {
            url: "https://images.unsplash.com/photo-1608248597359-58a4e320f0e8?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: false,
            displayOrder: 1,
          },
        ],
      },
      {
        name: "The Ordinary Niacinamide 10% + Zinc 1%",
        slug: "the-ordinary-niacinamide-10-zinc-1",
        brandSlug: "the-ordinary",
        categorySlug: "serums-ampoules",
        sku: "ORD-NZ-10-30",
        barcode: "769915190311",
        shortDescription: "High-strength vitamin and mineral blemish formula that reduces the appearance of skin blemishes and congestion.",
        description: "A water-based serum that boosts skin brightness, improves skin smoothness, and reinforces the skin barrier over time. Niacinamide (Vitamin B3) reduces blemishes and balances visible sebum activity, while Zinc PCA provides antimicrobial properties to clarify the complexion.",
        price: 1250.00,
        salePrice: 1100.00,
        costPrice: 720.00,
        stockQuantity: 18,
        lowStockThreshold: 5,
        trackInventory: true,
        status: "ACTIVE",
        isFeatured: true,
        volume: "30ml",
        skinType: "Oily, Combination, Blemish-Prone",
        skinConcerns: "Acne, Enlarged Pores, Oiliness, Hyperpigmentation",
        ingredients: "Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin",
        countryOfOrigin: "Canada",
        howToUse: "Apply a few drops to the entire face morning and evening before heavier creams. If topical Vitamin C is used as part of skincare, it should be applied at alternate times.",
        expiryInfo: "12M PAO",
        seoTitle: "The Ordinary Niacinamide 10% + Zinc 1% (30ml) | Authentic at Eloura",
        seoDescription: "Order 100% authentic The Ordinary Niacinamide serum in Bangladesh. Combat acne, reduce pores and control sebum.",
        collections: ["acne-blemish-control"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1608248597359-58a4e320f0e8?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      {
        name: "CeraVe Hydrating Facial Cleanser",
        slug: "cerave-hydrating-facial-cleanser",
        brandSlug: "cerave",
        categorySlug: "cleansers",
        sku: "CER-HYD-CL-237",
        barcode: "3606000537750",
        shortDescription: "Gentle non-foaming lotion cleanser formulated with 3 essential ceramides and hyaluronic acid.",
        description: "Developed with dermatologists, CeraVe Hydrating Facial Cleanser is a gentle face wash with ingredients like ceramides and hyaluronic acid that work to restore the skin's natural barrier to help the skin lock in moisture. Features patented MVE Delivery Technology to supply continuous nourishment all day.",
        price: 1850.00,
        salePrice: null,
        costPrice: 1200.00,
        stockQuantity: 4, // LOW STOCK TRIGGER (threshold 5)
        lowStockThreshold: 5,
        trackInventory: true,
        status: "ACTIVE",
        isFeatured: false,
        volume: "237ml",
        skinType: "Normal to Dry, Sensitive",
        skinConcerns: "Dryness, Damaged Barrier, Eczema-Prone",
        ingredients: "Aqua / Water / Eau, Glycerin, Cetearyl Alcohol, Peg-40 Stearate, Stearyl Alcohol, Potassium Phosphate, Ceramide Np, Ceramide Ap, Ceramide Eop, Carbomer, Glyceryl Stearate, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium Edta",
        countryOfOrigin: "USA",
        howToUse: "Wet skin with lukewarm water. Massage cleanser into skin in a gentle, circular motion. Rinse thoroughly and pat dry.",
        expiryInfo: "Exp: 2027-08",
        seoTitle: "CeraVe Hydrating Facial Cleanser 237ml | Eloura BD",
        seoDescription: "Buy authentic CeraVe Hydrating Cleanser in Bangladesh. Nourishing lotion cleanser with 3 essential ceramides.",
        collections: ["hydration-heroes"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      {
        name: "Hada Labo Gokujyun Premium Hyaluronic Acid Lotion",
        slug: "hada-labo-gokujyun-premium-hyaluronic-acid-lotion",
        brandSlug: "hada-labo",
        categorySlug: "toners-mists",
        sku: "HAD-GOK-PRE-170",
        barcode: "4987241167449",
        shortDescription: "Ultra-hydrating Japanese toner with 7 types of hyaluronic acid that penetrates deep moisture layers.",
        description: "Hada Labo Gokujyun Premium Lotion contains 7 types of hyaluronic acid to deliver the richest hydration to skin. Its rich serum-like texture locks in moisture deep inside the skin for long-lasting dewiness and plumpness without any sticky after-feel.",
        price: 1750.00,
        salePrice: 1590.00,
        costPrice: 1100.00,
        stockQuantity: 12,
        lowStockThreshold: 5,
        trackInventory: true,
        status: "ACTIVE",
        isFeatured: true,
        volume: "170ml",
        skinType: "Dry, Very Dry, Dehydrated Skin",
        skinConcerns: "Severe Dryness, Flakiness, Loss of Elasticity",
        ingredients: "Water, Butylene Glycol, Hydroxyethyl Urea, Glycerin, PPG-10 Methyl Glucose Ether, Diglycerin, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Hydroxypropyltrimonium Hyaluronate, Sodium Hyaluronate Crosspolymer",
        countryOfOrigin: "Japan",
        howToUse: "Pour a few drops into the palm of your hand and gently pat onto face and neck until thoroughly absorbed.",
        expiryInfo: "Exp: 2027-10",
        seoTitle: "Hada Labo Gokujyun Premium Lotion 170ml | Genuine J-Beauty Bangladesh",
        seoDescription: "Authentic Hada Labo Premium Hyaluronic Acid Lotion in Bangladesh. 7 types of HA for intense hydration.",
        collections: ["glass-skin-essentials", "bridal-radiance-glow"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      {
        name: "Minimalist Sunscreen SPF 50 PA++++",
        slug: "minimalist-sunscreen-spf-50-pa",
        brandSlug: "minimalist",
        categorySlug: "sunscreens",
        sku: "MIN-SUN-50-50",
        barcode: "8906141380123",
        shortDescription: "Lightweight, broad spectrum SPF 50 sunscreen infused with antioxidant multivitamins A, B, E, and F.",
        description: "Formulated with 4 very effective new age UV filters to provide protection from UVA & UVB rays. Infused with Vitamin A, B3, B5, E, and F that not only repair skin after sun exposure, but also soothe and nourish skin. Leaves zero white cast and feels completely weightless in humid Bangladeshi weather.",
        price: 1150.00,
        salePrice: null,
        costPrice: 750.00,
        stockQuantity: 0, // OUT OF STOCK TRIGGER
        lowStockThreshold: 5,
        trackInventory: true,
        status: "ACTIVE",
        isFeatured: true,
        volume: "50g",
        skinType: "All Skin Types, Acne-Prone",
        skinConcerns: "Sun Damage, Tanning, Dark Spots, Premature Aging",
        ingredients: "Aqua, Diisopropyl Adipate, Propylene Glycol Dicaprylate/Dicaprate, C12-15 Alkyl Benzoate, Diisopropyl Sebacate, Butyl Methoxydibenzoylmethane, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Niacinamide",
        countryOfOrigin: "India",
        howToUse: "Apply liberally on face, neck, and exposed skin 15 minutes before sun exposure. Reapply every 2 hours during continuous sun exposure.",
        expiryInfo: "Exp: 2027-06",
        seoTitle: "Minimalist SPF 50 Sunscreen 50g | Best Sunscreen in Bangladesh",
        seoDescription: "Authentic Minimalist Sunscreen SPF 50 PA++++ with multivitamins at Eloura. No white cast, lightweight, sweat-resistant.",
        collections: ["sun-protection"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
      {
        name: "COSRX Low pH Good Morning Gel Cleanser",
        slug: "cosrx-low-ph-good-morning-gel-cleanser",
        brandSlug: "cosrx",
        categorySlug: "cleansers",
        sku: "COS-LOW-PH-150",
        barcode: "8809416470122",
        shortDescription: "Mild sub-acidic gel cleanser formulated with purifying tea tree oil and natural BHA.",
        description: "Refines skin texture and gently removes impurities while strengthening the skin barrier with its low pH formula. Protects skin from moisture loss during morning cleansing.",
        price: 1100.00,
        salePrice: null,
        costPrice: 680.00,
        stockQuantity: 35,
        lowStockThreshold: 5,
        trackInventory: true,
        status: "DRAFT", // DRAFT STATUS TEST
        isFeatured: false,
        volume: "150ml",
        skinType: "Sensitive, Oily, Combination",
        skinConcerns: "Acne, Morning Sebum, Sensitive Skin",
        ingredients: "Water, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Polysorbate 20, Styrax Japonica Branch/Fruit/Leaf Extract, Butylene Glycol, Saccharomyces Ferment, Cryptomeria Japonica Leaf Extract, Nelumbo Nucifera Leaf Extract, Pinus Palustris Leaf Extract, Melaleuca Alternifolia (Tea Tree) Leaf Oil",
        countryOfOrigin: "South Korea",
        howToUse: "Use morning and night after removing makeup. Begin with wet hands and face. Squeeze a proper amount onto your hand and foam up. Gently massage onto face.",
        expiryInfo: "12M PAO",
        seoTitle: "COSRX Low pH Good Morning Gel Cleanser | Eloura",
        seoDescription: "Buy COSRX Low pH Cleanser in Bangladesh at Eloura. Gentle daily gel face wash for clear, refreshed skin.",
        collections: ["acne-blemish-control"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
            publicId: null,
            isPrimary: true,
            displayOrder: 0,
          },
        ],
      },
    ];

    for (const p of productsData) {
      const brandId = brandMap[p.brandSlug] || null;
      const categoryId = categoryMap[p.categorySlug] || null;

      const productRes = await client.query(
        `INSERT INTO products (
          name, slug, brand_id, category_id, sku, barcode,
          short_description, description, price, sale_price, cost_price,
          stock_quantity, low_stock_threshold, track_inventory,
          status, is_featured, volume, skin_type, skin_concerns,
          ingredients, country_of_origin, how_to_use, expiry_info,
          seo_title, seo_description
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25
        )
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            brand_id = EXCLUDED.brand_id,
            category_id = EXCLUDED.category_id,
            sku = EXCLUDED.sku,
            price = EXCLUDED.price,
            sale_price = EXCLUDED.sale_price,
            cost_price = EXCLUDED.cost_price,
            stock_quantity = EXCLUDED.stock_quantity,
            low_stock_threshold = EXCLUDED.low_stock_threshold,
            status = EXCLUDED.status,
            is_featured = EXCLUDED.is_featured,
            updated_at = NOW()
        RETURNING id`,
        [
          p.name, p.slug, brandId, categoryId, p.sku, p.barcode,
          p.shortDescription, p.description, p.price, p.salePrice, p.costPrice,
          p.stockQuantity, p.lowStockThreshold, p.trackInventory,
          p.status, p.isFeatured, p.volume, p.skinType, p.skinConcerns,
          p.ingredients, p.countryOfOrigin, p.howToUse, p.expiryInfo,
          p.seoTitle, p.seoDescription,
        ]
      );

      const productId = productRes.rows[0].id;

      // Seed Images
      await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
      for (const img of p.images) {
        await client.query(
          `INSERT INTO product_images (product_id, image_url, image_public_id, display_order, is_primary)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, img.url, img.publicId, img.displayOrder, img.isPrimary]
        );
      }

      // Seed Product Collections
      await client.query("DELETE FROM product_collections WHERE product_id = $1", [productId]);
      for (const colSlug of p.collections) {
        const colId = collectionMap[colSlug];
        if (colId) {
          await client.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [productId, colId]
          );
        }
      }
    }

    await client.query("COMMIT");
    console.log(" 6 Products with images and collection links seeded successfully!");
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding products failed:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedProducts();

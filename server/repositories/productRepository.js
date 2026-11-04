const { query, getClient } = require("../config/db");
const variantRepository = require("./variantRepository");

const productRepository = {
  /**
   * Find paginated products with rich filters, sorting, brand/category names, and primary image
   */
  async findProducts({
    search = "",
    status = "all",
    brandId = "all",
    categoryId = "all",
    collectionId = "all",
    stockStatus = "all",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];

    // Search filter across name, SKU, slug, and brand name
    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const idx = values.length;
      conditions.push(
        `(LOWER(p.name) LIKE $${idx} OR LOWER(p.sku) LIKE $${idx} OR LOWER(p.slug) LIKE $${idx} OR LOWER(COALESCE(b.name, '')) LIKE $${idx})`
      );
    }

    // Status filter
    if (status && status !== "all") {
      values.push(status.toUpperCase());
      conditions.push(`p.status = $${values.length}`);
    }

    // Brand filter
    if (brandId && brandId !== "all") {
      values.push(brandId);
      conditions.push(`p.brand_id = $${values.length}`);
    }

    // Category filter
    if (categoryId && categoryId !== "all") {
      values.push(categoryId);
      conditions.push(`p.category_id = $${values.length}`);
    }

    // Collection filter
    if (collectionId && collectionId !== "all") {
      values.push(collectionId);
      conditions.push(
        `EXISTS (SELECT 1 FROM product_collections pc WHERE pc.product_id = p.id AND pc.collection_id = $${values.length})`
      );
    }

    // Stock Status filter
    if (stockStatus === "in_stock") {
      conditions.push("(p.track_inventory = false OR p.stock_quantity > p.low_stock_threshold)");
    } else if (stockStatus === "low_stock") {
      conditions.push("(p.track_inventory = true AND p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold)");
    } else if (stockStatus === "out_of_stock") {
      conditions.push("(p.track_inventory = true AND p.stock_quantity <= 0)");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Allowed sort columns
    const allowedSortFields = {
      created_at: "p.created_at",
      name: "p.name",
      price: "p.price",
      stock_quantity: "p.stock_quantity",
      updated_at: "p.updated_at",
    };
    const sortField = allowedSortFields[sortBy] || "p.created_at";
    const direction = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause};
    `;
    const countRes = await query(countSql, values);
    const totalItems = parseInt(countRes.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    // Data query (Includes primary image or first available image)
    const dataValues = [...values, limitNum, offset];
    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.barcode,
        p.price,
        p.sale_price,
        p.cost_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.track_inventory,
        p.status,
        p.is_featured,
        p.volume,
        p.skin_type,
        p.country_of_origin,
        p.published_at,
        p.created_at,
        p.updated_at,
        b.id AS brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        -- Primary Image Thumbnail
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) AS thumbnail_url,
        -- Associated Collections
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', col.id, 
                'name', col.name, 
                'slug', col.slug
              ) ORDER BY col.name ASC
            ), 
            '[]'::json
          ) 
          FROM product_collections pc 
          JOIN collections col ON col.id = pc.collection_id 
          WHERE pc.product_id = p.id
        ) AS collections,
        -- Custom Variants List with Option Labels and Swatches
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', v_sub.id, 
                'optionsKey', v_sub.options_key, 
                'label', COALESCE(v_sub.option_labels, v_sub.options_key), 
                'swatchHex', v_sub.swatch_hex, 
                'price', v_sub.price::numeric, 
                'regularPrice', COALESCE(v_sub.regular_price, v_sub.price)::numeric, 
                'salePrice', v_sub.sale_price::numeric, 
                'isAvailable', v_sub.is_available
              ) ORDER BY v_sub.price ASC, v_sub.created_at ASC
            ), 
            '[]'::json
          ) 
          FROM (
            SELECT 
              pv.id, 
              pv.options_key, 
              pv.price, 
              pv.regular_price, 
              pv.sale_price, 
              pv.size_value, 
              pv.size_unit, 
              pv.is_available, 
              pv.created_at, 
              (
                SELECT string_agg(ov2.value, ' / ' ORDER BY po2.position ASC) 
                FROM variant_option_values vov2 
                JOIN option_values ov2 ON ov2.id = vov2.option_value_id 
                JOIN product_options po2 ON po2.id = ov2.option_id 
                WHERE vov2.variant_id = pv.id
              ) AS option_labels, 
              (
                SELECT ov3.swatch_hex 
                FROM variant_option_values vov3 
                JOIN option_values ov3 ON ov3.id = vov3.option_value_id 
                WHERE vov3.variant_id = pv.id AND ov3.swatch_hex IS NOT NULL 
                LIMIT 1
              ) AS swatch_hex 
            FROM product_variants pv 
            WHERE pv.product_id = p.id 
              AND pv.deleted_at IS NULL 
              AND pv.is_active = true 
              AND pv.options_key != 'default'
          ) v_sub
        ) AS variants,
        -- Associated Collections Count
        (
          SELECT COUNT(*)::int 
          FROM product_collections pc 
          WHERE pc.product_id = p.id
        ) AS collections_count,
        -- Variant Pricing Summary
        (
          SELECT MIN(pv.price)
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.is_active = true
        ) AS min_variant_price,
        (
          SELECT MAX(pv.price)
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.is_active = true
        ) AS max_variant_price,
        (
          SELECT COUNT(*)::int
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.deleted_at IS NULL AND pv.is_active = true AND pv.options_key != 'default'
        ) AS custom_variants_count
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY ${sortField} ${direction}
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};
    `;

    const dataRes = await query(dataSql, dataValues);

    return {
      products: dataRes.rows.map(this.formatProductListItem),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  },

  /**
   * Real-time summary statistics for Product Management Dashboard
   */
  async getSummaryCounts() {
    const sql = `
      SELECT 
        COUNT(*)::int AS total_products,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int AS active_products,
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int AS draft_products,
        COUNT(CASE WHEN status = 'ARCHIVED' THEN 1 END)::int AS archived_products,
        COUNT(CASE WHEN track_inventory = true AND stock_quantity > 0 AND stock_quantity <= low_stock_threshold THEN 1 END)::int AS low_stock_products,
        COUNT(CASE WHEN track_inventory = true AND stock_quantity <= 0 THEN 1 END)::int AS out_of_stock_products,
        COALESCE(SUM(price * stock_quantity), 0)::numeric AS total_inventory_value
      FROM products;
    `;
    const res = await query(sql);
    const row = res.rows[0] || {};

    return {
      total: row.total_products || 0,
      active: row.active_products || 0,
      draft: row.draft_products || 0,
      archived: row.archived_products || 0,
      lowStock: row.low_stock_products || 0,
      outOfStock: row.out_of_stock_products || 0,
      totalInventoryValue: parseFloat(row.total_inventory_value || 0),
    };
  },

  /**
   * Find single product by ID with full details, images array, brand, category, and collections
   */
  async findById(id) {
    const productSql = `
      SELECT 
        p.*,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
      LIMIT 1;
    `;
    const productRes = await query(productSql, [id]);
    if (!productRes.rows[0]) return null;

    const product = productRes.rows[0];

    // Get images
    const imagesSql = `
      SELECT id, image_url, image_public_id, display_order, is_primary
      FROM product_images
      WHERE product_id = $1
      ORDER BY is_primary DESC, display_order ASC, created_at ASC;
    `;
    const imagesRes = await query(imagesSql, [id]);

    // Get collections
    const collectionsSql = `
      SELECT c.id, c.name, c.slug
      FROM collections c
      JOIN product_collections pc ON pc.collection_id = c.id
      WHERE pc.product_id = $1
      ORDER BY c.name ASC;
    `;
    const collectionsRes = await query(collectionsSql, [id]);

    // Get options & variants
    const options = await variantRepository.getOptionsByProductId(id);
    const variants = await variantRepository.getVariantsByProductId(id, null, { includeInactive: true });

    return this.formatFullProduct(product, imagesRes.rows, collectionsRes.rows, options, variants);
  },

  /**
   * Find single product by Slug (for public storefront and duplicate slug checks)
   */
  async findBySlug(slug, excludeId = null) {
    let sql = `SELECT * FROM products WHERE slug = $1`;
    const params = [slug];
    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1;`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Find product by SKU (for duplicate SKU checks)
   */
  async findBySku(sku, excludeId = null) {
    if (!sku) return null;
    let sql = `SELECT * FROM products WHERE LOWER(sku) = LOWER($1)`;
    const params = [sku.trim()];
    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }
    sql += ` LIMIT 1;`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Create product record within an existing client transaction or pool
   */
  async create(data, dbClient = null) {
    const executor = dbClient || { query };
    const isPublished = (data.status || "ACTIVE") === "ACTIVE";
    const publishedAt = data.publishedAt
      ? new Date(data.publishedAt)
      : isPublished
      ? new Date()
      : null;

    const sql = `
      INSERT INTO products (
        name, slug, brand_id, category_id, sku, barcode,
        short_description, description, price, sale_price, cost_price,
        stock_quantity, low_stock_threshold, track_inventory,
        status, is_featured, volume, skin_type, skin_concerns,
        ingredients, country_of_origin, how_to_use, expiry_info,
        seo_title, seo_description, published_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26
      )
      RETURNING *;
    `;
    const params = [
      data.name,
      data.slug,
      data.brandId || null,
      data.categoryId || null,
      data.sku || null,
      data.barcode || null,
      data.shortDescription || null,
      data.description || null,
      data.price,
      data.salePrice || null,
      data.costPrice || null,
      data.stockQuantity ?? 0,
      data.lowStockThreshold ?? 5,
      data.trackInventory ?? true,
      data.status || "ACTIVE",
      data.isFeatured ?? false,
      data.volume || null,
      data.skinType || null,
      data.skinConcerns || null,
      data.ingredients || null,
      data.countryOfOrigin || null,
      data.howToUse || null,
      data.expiryInfo || null,
      data.seoTitle || null,
      data.seoDescription || null,
      publishedAt,
    ];

    const res = await executor.query(sql, params);
    return res.rows[0];
  },

  /**
   * Update product record within an existing client transaction or pool
   */
  async update(id, data, dbClient = null) {
    const executor = dbClient || { query };
    const fields = [];
    const params = [];

    const fieldMap = {
      name: "name",
      slug: "slug",
      brandId: "brand_id",
      categoryId: "category_id",
      sku: "sku",
      barcode: "barcode",
      shortDescription: "short_description",
      description: "description",
      price: "price",
      salePrice: "sale_price",
      costPrice: "cost_price",
      stockQuantity: "stock_quantity",
      lowStockThreshold: "low_stock_threshold",
      trackInventory: "track_inventory",
      status: "status",
      isFeatured: "is_featured",
      volume: "volume",
      skinType: "skin_type",
      skinConcerns: "skin_concerns",
      ingredients: "ingredients",
      countryOfOrigin: "country_of_origin",
      howToUse: "how_to_use",
      expiryInfo: "expiry_info",
      seoTitle: "seo_title",
      seoDescription: "seo_description",
      publishedAt: "published_at",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        params.push(data[key]);
        fields.push(`${col} = $${params.length}`);
      }
    }

    // If status transitioned to ACTIVE and published_at was not explicitly passed,
    // ensure published_at is set to NOW() if it was NULL, preserving existing published_at if already set.
    if (data.status === "ACTIVE" && data.publishedAt === undefined) {
      fields.push("published_at = COALESCE(published_at, NOW())");
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = NOW()");
    params.push(id);

    const sql = `
      UPDATE products
      SET ${fields.join(", ")}
      WHERE id = $${params.length}
      RETURNING *;
    `;

    const res = await executor.query(sql, params);
    return res.rows[0];
  },

  /**
   * Quick status update (ACTIVE / DRAFT / ARCHIVED)
   * If activating, sets published_at = COALESCE(published_at, NOW())
   */
  async updateStatus(id, status, dbClient = null) {
    const executor = dbClient || { query };
    let sql;
    let params;
    if (status === "ACTIVE") {
      sql = `
        UPDATE products
        SET status = $1, published_at = COALESCE(published_at, NOW()), updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, status, published_at, updated_at;
      `;
      params = [status, id];
    } else {
      sql = `
        UPDATE products
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, status, published_at, updated_at;
      `;
      params = [status, id];
    }
    const res = await executor.query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Get recently published new arrivals for storefront
   * Strictly customer-visible (ACTIVE, published_at <= NOW()), ordered by published_at DESC, id DESC
   * Internal cost_price or private supplier metadata is strictly excluded
   */
  async getNewArrivals(limit = 8) {
    const limitNum = Math.min(24, Math.max(1, parseInt(limit, 10) || 8));
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        p.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.track_inventory,
        p.is_featured,
        p.volume,
        p.skin_type,
        p.published_at,
        p.created_at,
        pi.image_url AS thumbnail_url
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC 
        LIMIT 1
      ) pi ON true
      WHERE p.status = 'ACTIVE' 
        AND p.published_at IS NOT NULL 
        AND p.published_at <= NOW()
      ORDER BY p.published_at DESC, p.id DESC
      LIMIT $1;
    `;
    const res = await query(sql, [limitNum]);
    return res.rows.map((row) => {
      const priceNum = parseFloat(row.price || 0);
      const salePriceNum = row.sale_price !== null ? parseFloat(row.sale_price) : null;
      const stockQty = parseInt(row.stock_quantity ?? 0, 10);
      const lowThreshold = parseInt(row.low_stock_threshold ?? 5, 10);
      const trackInventory = Boolean(row.track_inventory);

      let stockStatus = "IN_STOCK";
      if (trackInventory) {
        if (stockQty <= 0) {
          stockStatus = "OUT_OF_STOCK";
        } else if (stockQty <= lowThreshold) {
          stockStatus = "LOW_STOCK";
        }
      }

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: priceNum,
        salePrice: salePriceNum,
        stockQuantity: stockQty,
        lowStockThreshold: lowThreshold,
        trackInventory,
        stockStatus,
        isFeatured: Boolean(row.is_featured),
        volume: row.volume,
        skinType: row.skin_type,
        publishedAt: row.published_at,
        thumbnailUrl: row.thumbnail_url || null,
        brand: row.brand_id
          ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug }
          : null,
        category: row.category_id
          ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
          : null,
      };
    });
  },

  /**
   * Delete product (with cascades handled by PostgreSQL FKs)
   */
  async delete(id, dbClient = null) {
    const executor = dbClient || { query };
    // Get image public IDs first so caller can clean up Cloudinary assets
    const imagesRes = await executor.query(
      "SELECT image_public_id FROM product_images WHERE product_id = $1 AND image_public_id IS NOT NULL",
      [id]
    );

    const deleteRes = await executor.query("DELETE FROM products WHERE id = $1 RETURNING id, name;", [id]);
    return {
      deleted: Boolean(deleteRes.rows[0]),
      product: deleteRes.rows[0] || null,
      imagePublicIds: imagesRes.rows.map(r => r.image_public_id).filter(Boolean),
    };
  },

  /**
   * Synchronize collections for a product
   */
  async syncCollections(productId, collectionIds = [], dbClient = null) {
    const executor = dbClient || { query };
    await executor.query("DELETE FROM product_collections WHERE product_id = $1", [productId]);

    if (Array.isArray(collectionIds) && collectionIds.length > 0) {
      for (const colId of collectionIds) {
        if (colId) {
          await executor.query(
            `INSERT INTO product_collections (product_id, collection_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [productId, colId]
          );
        }
      }
    }
  },

  /**
   * Synchronize / Save product images
   */
  async saveImages(productId, images = [], dbClient = null) {
    const executor = dbClient || { query };
    if (!Array.isArray(images)) return;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      await executor.query(
        `INSERT INTO product_images (product_id, image_url, image_public_id, display_order, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          productId,
          img.imageUrl,
          img.imagePublicId || null,
          img.displayOrder ?? i,
          Boolean(img.isPrimary),
        ]
      );
    }
  },

  /**
   * Remove specific images by IDs or public IDs
   */
  async removeImages(imageIds = [], dbClient = null) {
    if (!imageIds || imageIds.length === 0) return [];
    const executor = dbClient || { query };
    const res = await executor.query(
      `DELETE FROM product_images 
       WHERE id = ANY($1::uuid[]) 
       RETURNING id, image_public_id`,
      [imageIds]
    );
    return res.rows;
  },

  // ─── Formatters ───

  formatProductListItem(row) {
    const priceNum = parseFloat(row.price || 0);
    const salePriceNum = row.sale_price !== null ? parseFloat(row.sale_price) : null;
    const costPriceNum = row.cost_price !== null ? parseFloat(row.cost_price) : null;
    const stockQty = parseInt(row.stock_quantity ?? 0, 10);
    const lowThreshold = parseInt(row.low_stock_threshold ?? 5, 10);
    const trackInventory = Boolean(row.track_inventory);

    let stockStatus = "IN_STOCK";
    if (trackInventory) {
      if (stockQty <= 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (stockQty <= lowThreshold) {
        stockStatus = "LOW_STOCK";
      }
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      barcode: row.barcode,
      price: priceNum,
      salePrice: salePriceNum,
      costPrice: costPriceNum,
      stockQuantity: stockQty,
      lowStockThreshold: lowThreshold,
      trackInventory,
      stockStatus,
      status: row.status,
      isFeatured: Boolean(row.is_featured),
      volume: row.volume,
      skinType: row.skin_type,
      countryOfOrigin: row.country_of_origin,
      thumbnailUrl: row.thumbnail_url || null,
      brand: row.brand_id
        ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug }
        : null,
      category: row.category_id
        ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
        : null,
      collectionsCount: parseInt(row.collections_count || 0, 10),
      collections: Array.isArray(row.collections)
        ? row.collections
        : (row.collections ? (typeof row.collections === "string" ? JSON.parse(row.collections) : row.collections) : []),
      variants: Array.isArray(row.variants)
        ? row.variants
        : (row.variants ? (typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants) : []),
      minVariantPrice: row.min_variant_price !== null && row.min_variant_price !== undefined ? Number(row.min_variant_price) : null,
      maxVariantPrice: row.max_variant_price !== null && row.max_variant_price !== undefined ? Number(row.max_variant_price) : null,
      hasVariants: Boolean(parseInt(row.custom_variants_count || 0, 10) > 0),
      publishedAt: row.published_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  formatFullProduct(row, images = [], collections = [], options = [], variants = []) {
    const base = this.formatProductListItem(row);
    const hasCustomVariants = Boolean(
      options && options.length > 0 && variants && variants.some((v) => v.optionsKey !== "default")
    );
    return {
      ...base,
      hasVariants: hasCustomVariants,
      options: options || [],
      variants: variants || [],
      shortDescription: row.short_description || "",
      description: row.description || "",
      skinConcerns: row.skin_concerns || "",
      ingredients: row.ingredients || "",
      howToUse: row.how_to_use || "",
      expiryInfo: row.expiry_info || "",
      seoTitle: row.seo_title || "",
      seoDescription: row.seo_description || "",
      images: images.map(img => ({
        id: img.id,
        imageUrl: img.image_url,
        imagePublicId: img.image_public_id,
        displayOrder: img.display_order,
        isPrimary: Boolean(img.is_primary),
      })),
      collections: collections.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
    };
  },
};

module.exports = productRepository;


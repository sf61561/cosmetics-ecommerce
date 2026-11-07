const { query } = require("../config/db");

class SearchRepository {
  /**
   * Fast lightweight suggestions for the autocomplete dropdown
   */
  async getSuggestions(searchTerm, { limit = 6 } = {}) {
    if (!searchTerm || typeof searchTerm !== "string" || !searchTerm.trim()) {
      return { products: [], categories: [], brands: [], queries: [] };
    }

    const cleanTerm = searchTerm.trim();
    const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 6));

    // 1. Matching Products
    const productSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.track_inventory,
        p.status,
        b.name AS brand_name,
        c.name AS category_name,
        pi.image_url AS thumbnail_url,
        (
          CASE 
            WHEN LOWER(p.name) = LOWER($1) THEN 100.0
            WHEN LOWER(p.name) LIKE LOWER($1) || '%' THEN 50.0
            ELSE 0.0
          END +
          (word_similarity($1, p.name) * 40.0) +
          (word_similarity($1, COALESCE(b.name, '')) * 25.0) +
          (ts_rank(
            to_tsvector('simple', p.name || ' ' || COALESCE(b.name, '')),
            plainto_tsquery('simple', $1)
          ) * 15.0) +
          (CASE WHEN NOT p.track_inventory OR p.stock_quantity > 0 THEN 5.0 ELSE -15.0 END)
        ) AS relevance_rank
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC, created_at ASC 
        LIMIT 1
      ) pi ON true
      WHERE p.status = 'ACTIVE'
        AND (
          to_tsvector('simple', p.name || ' ' || COALESCE(p.sku, '') || ' ' || COALESCE(b.name, '')) @@ plainto_tsquery('simple', $1)
          OR p.name % $1
          OR word_similarity($1, p.name) >= 0.28
          OR word_similarity($1, COALESCE(b.name, '')) >= 0.28
          OR LOWER(p.name) LIKE '%' || LOWER($1) || '%'
          OR LOWER(COALESCE(b.name, '')) LIKE '%' || LOWER($1) || '%'
          OR LOWER(COALESCE(c.name, '')) LIKE '%' || LOWER($1) || '%'
        )
      ORDER BY relevance_rank DESC, (p.stock_quantity > 0) DESC, p.created_at DESC
      LIMIT $2;
    `;

    // 2. Matching Collections
    const collectionSql = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(DISTINCT pc.product_id)::int AS count
      FROM collections c
      LEFT JOIN product_collections pc ON pc.collection_id = c.id
      LEFT JOIN products p ON p.id = pc.product_id AND p.status = 'ACTIVE'
      WHERE c.is_active = true
        AND (
          c.name % $1
          OR word_similarity($1, c.name) >= 0.28
          OR LOWER(c.name) LIKE '%' || LOWER($1) || '%'
        )
      GROUP BY c.id, c.name, c.slug
      ORDER BY word_similarity($1, c.name) DESC, count DESC
      LIMIT 3;
    `;

    // 3. Matching Brands
    const brandSql = `
      SELECT 
        b.id,
        b.name,
        b.slug,
        COUNT(p.id)::int AS count
      FROM brands b
      LEFT JOIN products p ON p.brand_id = b.id AND p.status = 'ACTIVE'
      WHERE b.is_active = true
        AND (
          b.name % $1
          OR word_similarity($1, b.name) >= 0.28
          OR LOWER(b.name) LIKE '%' || LOWER($1) || '%'
        )
      GROUP BY b.id, b.name, b.slug
      ORDER BY word_similarity($1, b.name) DESC, count DESC
      LIMIT 3;
    `;

    const [prodRes, colRes, brandRes] = await Promise.all([
      query(productSql, [cleanTerm, limitNum]),
      query(collectionSql, [cleanTerm]),
      query(brandSql, [cleanTerm]),
    ]);

    const products = prodRes.rows.map((row) => {
      const regularPrice = Number(row.price) || 0;
      const salePrice = row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null;
      const currentPrice = salePrice !== null && salePrice < regularPrice ? salePrice : regularPrice;
      const inStock = !row.track_inventory || Number(row.stock_quantity || 0) > 0;

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: regularPrice,
        salePrice,
        currentPrice,
        inStock,
        stockStatus: inStock ? "in_stock" : "out_of_stock",
        brandName: row.brand_name || "Eloura",
        categoryName: row.category_name || null,
        thumbnailUrl: row.thumbnail_url || null,
      };
    });

    const collections = colRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      count: row.count,
    }));

    const brands = brandRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      count: row.count,
    }));

    // Generate query suggestions from top matching product titles or terms
    const queries = [];
    const lowerClean = cleanTerm.toLowerCase();
    for (const p of products) {
      const pName = p.name;
      if (pName.toLowerCase().startsWith(lowerClean) && !queries.includes(pName)) {
        queries.push(pName);
        if (queries.length >= 3) break;
      }
    }

    return {
      query: cleanTerm,
      products,
      collections,
      categories: collections,
      brands,
      queries,
    };
  }

  /**
   * Search full catalog with multi-facet filtering, sorting and pagination
   */
  async searchProducts({
    searchTerm = "",
    collection = "",
    category = "",
    brand = "",
    minPrice = null,
    maxPrice = null,
    inStock = null,
    sort = "relevance",
    page = 1,
    limit = 20,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const cleanTerm = (searchTerm || "").trim();

    const conditions = ["p.status = 'ACTIVE'"];
    const params = [];

    // Search query matching
    if (cleanTerm) {
      params.push(cleanTerm);
      const queryParamIndex = params.length;
      conditions.push(`(
        to_tsvector('simple', 
          p.name || ' ' || 
          COALESCE(p.sku, '') || ' ' || 
          COALESCE(p.short_description, '') || ' ' || 
          COALESCE(p.description, '') || ' ' || 
          COALESCE(p.ingredients, '') || ' ' || 
          COALESCE(p.skin_type, '') || ' ' || 
          COALESCE(b.name, '') || ' ' || 
          COALESCE(c.name, '')
        ) @@ plainto_tsquery('simple', $${queryParamIndex})
        OR p.name % $${queryParamIndex}
        OR b.name % $${queryParamIndex}
        OR word_similarity($${queryParamIndex}, p.name) >= 0.28
        OR word_similarity($${queryParamIndex}, COALESCE(b.name, '')) >= 0.28
        OR LOWER(p.name) LIKE '%' || LOWER($${queryParamIndex}) || '%'
        OR LOWER(COALESCE(b.name, '')) LIKE '%' || LOWER($${queryParamIndex}) || '%'
        OR LOWER(COALESCE(c.name, '')) LIKE '%' || LOWER($${queryParamIndex}) || '%'
      )`);
    }

    // Collection / Category filter (slug or uuid)
    const activeCollection = collection || category;
    if (activeCollection && activeCollection !== "all") {
      params.push(activeCollection);
      const idx = params.length;
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM product_collections pc 
          JOIN collections col ON col.id = pc.collection_id 
          WHERE pc.product_id = p.id AND (col.slug = $${idx} OR col.id::text = $${idx})
        )
        OR (c.slug = $${idx} OR c.id::text = $${idx})
      )`);
    }

    // Brand filter (slug or uuid)
    if (brand && brand !== "all") {
      params.push(brand);
      const idx = params.length;
      conditions.push(`(b.slug = $${idx} OR b.id::text = $${idx})`);
    }

    // Min Price filter
    if (minPrice !== null && minPrice !== undefined && minPrice !== "" && !isNaN(Number(minPrice))) {
      params.push(Number(minPrice));
      const idx = params.length;
      conditions.push(`COALESCE(p.sale_price, p.price) >= $${idx}`);
    }

    // Max Price filter
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== "" && !isNaN(Number(maxPrice))) {
      params.push(Number(maxPrice));
      const idx = params.length;
      conditions.push(`COALESCE(p.sale_price, p.price) <= $${idx}`);
    }

    // In Stock only filter
    if (inStock === true || inStock === "true" || inStock === "1") {
      conditions.push(`(NOT p.track_inventory OR p.stock_quantity > 0)`);
    }

    const whereClause = conditions.join(" AND ");

    // Sorting definition
    let orderByClause = "p.created_at DESC";
    if (cleanTerm && (sort === "relevance" || !sort)) {
      orderByClause = "relevance_rank DESC, (p.stock_quantity > 0) DESC, p.created_at DESC";
    } else if (sort === "price_asc") {
      orderByClause = "COALESCE(p.sale_price, p.price) ASC, p.id DESC";
    } else if (sort === "price_desc") {
      orderByClause = "COALESCE(p.sale_price, p.price) DESC, p.id DESC";
    } else if (sort === "newest") {
      orderByClause = "p.created_at DESC";
    } else if (sort === "best_selling") {
      orderByClause = "(p.stock_quantity > 0) DESC, p.is_featured DESC, p.created_at DESC";
    }

    // Rank expression
    let rankSelect = "0.0 AS relevance_rank";
    if (cleanTerm) {
      rankSelect = `
        (
          CASE 
            WHEN LOWER(p.name) = LOWER($1) THEN 100.0
            WHEN LOWER(p.name) LIKE LOWER($1) || '%' THEN 50.0
            ELSE 0.0
          END +
          (word_similarity($1, p.name) * 40.0) +
          (word_similarity($1, COALESCE(b.name, '')) * 25.0) +
          (ts_rank(
            to_tsvector('simple', p.name || ' ' || COALESCE(b.name, '') || ' ' || COALESCE(c.name, '')),
            plainto_tsquery('simple', $1)
          ) * 15.0) +
          (CASE WHEN NOT p.track_inventory OR p.stock_quantity > 0 THEN 10.0 ELSE -20.0 END) +
          (CASE WHEN p.is_featured THEN 5.0 ELSE 0.0 END)
        ) AS relevance_rank
      `;
    }

    // Count Query
    const countSql = `
      SELECT COUNT(p.id)::int AS total
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Items Query
    const itemsParams = [...params, limitNum, offset];
    const itemsSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.track_inventory,
        p.status,
        p.volume,
        p.skin_type,
        p.is_featured,
        p.average_rating,
        p.review_count,
        p.created_at,
        b.id AS brand_id,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        pi.image_url AS thumbnail_url,
        ${rankSelect}
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = p.id 
        ORDER BY is_primary DESC, display_order ASC, created_at ASC 
        LIMIT 1
      ) pi ON true
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${itemsParams.length - 1} OFFSET $${itemsParams.length};
    `;
    const itemsRes = await query(itemsSql, itemsParams);

    const items = itemsRes.rows.map((row) => {
      const regularPrice = Number(row.price) || 0;
      const salePrice = row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null;
      const hasDiscount = salePrice !== null && salePrice < regularPrice;
      const currentPrice = hasDiscount ? salePrice : regularPrice;
      const stockQuantity = Number(row.stock_quantity) || 0;
      const inStock = !row.track_inventory || stockQuantity > 0;

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        price: regularPrice,
        salePrice,
        currentPrice,
        hasDiscount,
        stockQuantity,
        trackInventory: row.track_inventory,
        inStock,
        stockStatus: inStock ? "in_stock" : "out_of_stock",
        averageRating: parseFloat(row.average_rating || 0.0),
        reviewCount: parseInt(row.review_count || 0, 10),
        volume: row.volume || null,
        skinType: row.skin_type || null,
        isFeatured: row.is_featured || false,
        brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
        brandName: row.brand_name || "Eloura",
        category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
        categoryName: row.category_name || null,
        thumbnailUrl: row.thumbnail_url || null,
        createdAt: row.created_at,
      };
    });

    // Compute Facets
    const facetConditions = ["p.status = 'ACTIVE'"];
    const facetParams = [];
    if (cleanTerm) {
      facetParams.push(cleanTerm);
      facetConditions.push(`(
        to_tsvector('simple', p.name || ' ' || COALESCE(p.sku, '') || ' ' || COALESCE(b.name, '') || ' ' || COALESCE(c.name, '')) @@ plainto_tsquery('simple', $1)
        OR p.name % $1
        OR word_similarity($1, p.name) >= 0.28
        OR word_similarity($1, COALESCE(b.name, '')) >= 0.28
        OR LOWER(p.name) LIKE '%' || LOWER($1) || '%'
        OR LOWER(COALESCE(b.name, '')) LIKE '%' || LOWER($1) || '%'
      )`);
    }
    const facetWhere = facetConditions.join(" AND ");

    const facetSql = `
      SELECT 
        MIN(COALESCE(p.sale_price, p.price))::numeric(10,2) AS min_price,
        MAX(COALESCE(p.sale_price, p.price))::numeric(10,2) AS max_price
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${facetWhere};
    `;

    const colFacetSql = `
      SELECT 
        c.id, c.name, c.slug, COUNT(DISTINCT p.id)::int AS count
      FROM collections c
      JOIN product_collections pc ON pc.collection_id = c.id
      JOIN products p ON p.id = pc.product_id AND p.status = 'ACTIVE'
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE ${facetWhere}
      GROUP BY c.id, c.name, c.slug
      ORDER BY count DESC, c.name ASC
      LIMIT 15;
    `;

    const brandFacetSql = `
      SELECT 
        b.id, b.name, b.slug, COUNT(p.id)::int AS count
      FROM brands b
      JOIN products p ON p.brand_id = b.id AND p.status = 'ACTIVE'
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${facetWhere}
      GROUP BY b.id, b.name, b.slug
      ORDER BY count DESC, b.name ASC
      LIMIT 15;
    `;

    const [facetRes, colFacetRes, brandFacetRes] = await Promise.all([
      query(facetSql, facetParams),
      query(colFacetSql, facetParams),
      query(brandFacetSql, facetParams),
    ]);

    const priceRange = {
      min: Number(facetRes.rows[0]?.min_price || 0),
      max: Number(facetRes.rows[0]?.max_price || 0),
    };

    return {
      query: cleanTerm,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages,
      items,
      facets: {
        collections: colFacetRes.rows,
        categories: colFacetRes.rows,
        brands: brandFacetRes.rows,
        priceRange,
      },
    };
  }

  /**
   * Typo correction ("Did you mean: ...?") helper when results are 0
   */
  async getDidYouMean(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string" || searchTerm.trim().length < 2) {
      return null;
    }

    const clean = searchTerm.trim().toLowerCase();

    const sql = `
      SELECT word FROM (
        SELECT unnest(string_to_array(lower(name), ' ')) AS word, word_similarity($1, unnest(string_to_array(lower(name), ' '))) AS wsim
        FROM products WHERE status = 'ACTIVE'
        UNION ALL
        SELECT lower(name) AS word, word_similarity($1, lower(name)) AS wsim
        FROM categories WHERE is_active = true
        UNION ALL
        SELECT lower(name) AS word, word_similarity($1, lower(name)) AS wsim
        FROM brands WHERE is_active = true
      ) candidates
      WHERE length(word) >= 3 AND wsim >= 0.28 AND word <> $1
      ORDER BY wsim DESC, length(word) ASC
      LIMIT 1;
    `;

    const res = await query(sql, [clean]);
    return res.rows[0]?.word || null;
  }
}

module.exports = new SearchRepository();

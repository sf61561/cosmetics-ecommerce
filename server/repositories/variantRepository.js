const { query } = require("../config/db");

class VariantRepository {
  /**
   * Create a product option (e.g. 'Shade', 'Size')
   */
  async createOption(productId, { name, type = "button", position = 0 }, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO product_options (product_id, name, type, position)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (product_id, name) 
      DO UPDATE SET type = EXCLUDED.type, position = EXCLUDED.position, updated_at = NOW()
      RETURNING id, product_id, name, type, position, created_at, updated_at
    `;
    const res = await q(sql, [productId, name.trim(), type, position]);
    return res.rows[0];
  }

  /**
   * Create an option value (e.g. 'Rose', '50 ml')
   */
  async createOptionValue(
    optionId,
    { value, swatchHex = null, swatchImage = null, swatchImagePublicId = null, position = 0 },
    client = null
  ) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO option_values (option_id, value, swatch_hex, swatch_image, swatch_image_public_id, position)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (option_id, value)
      DO UPDATE SET swatch_hex = EXCLUDED.swatch_hex,
                    swatch_image = EXCLUDED.swatch_image,
                    swatch_image_public_id = EXCLUDED.swatch_image_public_id,
                    position = EXCLUDED.position
      RETURNING id, option_id, value, swatch_hex, swatch_image, swatch_image_public_id, position, created_at
    `;
    const res = await q(sql, [
      optionId,
      value.trim(),
      swatchHex || null,
      swatchImage || null,
      swatchImagePublicId || null,
      position,
    ]);
    return res.rows[0];
  }

  /**
   * Create a concrete product variant
   */
  async createVariant(
    productId,
    {
      optionsKey = "default",
      price,
      compareAtPrice = null,
      regularPrice = null,
      salePrice = null,
      costPrice = null,
      sizeValue = null,
      sizeUnit = null,
      imageUrl = null,
      imagePublicId = null,
      isAvailable = true,
      isActive = true,
    },
    client = null
  ) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO product_variants (
        product_id, options_key, price, compare_at_price,
        regular_price, sale_price, cost_price,
        size_value, size_unit, image_url, image_public_id,
        is_available, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, product_id, options_key, price, compare_at_price,
                regular_price, sale_price, cost_price,
                size_value, size_unit, image_url, image_public_id,
                is_available, is_active, created_at, updated_at
    `;
    const res = await q(sql, [
      productId,
      optionsKey,
      price,
      compareAtPrice || null,
      regularPrice || null,
      salePrice || null,
      costPrice || null,
      sizeValue || null,
      sizeUnit || null,
      imageUrl || null,
      imagePublicId || null,
      isAvailable,
      isActive,
    ]);
    return res.rows[0];
  }

  /**
   * Update an existing product variant by ID
   */
  async updateVariant(
    id,
    {
      price,
      compareAtPrice = null,
      regularPrice = null,
      salePrice = null,
      costPrice = null,
      sizeValue = null,
      sizeUnit = null,
      imageUrl = null,
      imagePublicId = null,
      isAvailable = true,
      isActive = true,
    },
    client = null
  ) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      UPDATE product_variants
      SET price = $2,
          compare_at_price = $3,
          regular_price = $4,
          sale_price = $5,
          cost_price = $6,
          size_value = $7,
          size_unit = $8,
          image_url = $9,
          image_public_id = $10,
          is_available = $11,
          is_active = $12,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, product_id, options_key, price, compare_at_price,
                regular_price, sale_price, cost_price,
                size_value, size_unit, image_url, image_public_id,
                is_available, is_active, created_at, updated_at
    `;
    const res = await q(sql, [
      id,
      price,
      compareAtPrice || null,
      regularPrice || null,
      salePrice || null,
      costPrice || null,
      sizeValue || null,
      sizeUnit || null,
      imageUrl || null,
      imagePublicId || null,
      isAvailable,
      isActive,
    ]);
    return res.rows[0];
  }

  /**
   * Link variant to an option value
   */
  async linkVariantOptionValue(variantId, optionValueId, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO variant_option_values (variant_id, option_value_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await q(sql, [variantId, optionValueId]);
  }

  /**
   * Get all options and their option values for a product
   */
  async getOptionsByProductId(productId, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      SELECT 
        po.id, po.product_id, po.name, po.type, po.position,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ov.id,
              'optionId', ov.option_id,
              'value', ov.value,
              'swatchHex', ov.swatch_hex,
              'swatchImage', ov.swatch_image,
              'position', ov.position
            ) ORDER BY ov.position ASC
          ) FILTER (WHERE ov.id IS NOT NULL),
          '[]'::json
        ) AS values
      FROM product_options po
      LEFT JOIN option_values ov ON ov.option_id = po.id
      WHERE po.product_id = $1
      GROUP BY po.id
      ORDER BY po.position ASC
    `;
    const res = await q(sql, [productId]);
    return res.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      type: row.type,
      position: row.position,
      values: row.values || [],
    }));
  }

  /**
   * Get all variants for a product with their assigned option values
   */
  async getVariantsByProductId(productId, client = null, { includeInactive = false } = {}) {
    const q = client ? client.query.bind(client) : query;
    const filterActive = includeInactive ? "" : "AND pv.is_active = true";

    const sql = `
      SELECT 
        pv.id,
        pv.product_id,
        pv.options_key,
        pv.price,
        pv.compare_at_price,
        pv.regular_price,
        pv.sale_price,
        pv.cost_price,
        pv.size_value,
        pv.size_unit,
        pv.image_url,
        pv.image_public_id,
        pv.is_available,
        pv.is_active,
        pv.created_at,
        pv.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'optionId', po.id,
              'optionName', po.name,
              'optionValueId', ov.id,
              'value', ov.value,
              'swatchHex', ov.swatch_hex,
              'swatchImage', ov.swatch_image
            )
          ) FILTER (WHERE ov.id IS NOT NULL),
          '[]'::json
        ) AS selected_options
      FROM product_variants pv
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
      LEFT JOIN option_values ov ON ov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = ov.option_id
      WHERE pv.product_id = $1 
        AND pv.deleted_at IS NULL
        ${filterActive}
      GROUP BY pv.id
      ORDER BY pv.created_at ASC
    `;
    const res = await q(sql, [productId]);
    return res.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      optionsKey: row.options_key,
      price: Number(row.price),
      compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      regularPrice:
        row.regular_price !== null
          ? Number(row.regular_price)
          : (row.compare_at_price ? Number(row.compare_at_price) : Number(row.price)),
      salePrice:
        row.sale_price !== null
          ? Number(row.sale_price)
          : (row.compare_at_price && Number(row.compare_at_price) > Number(row.price) ? Number(row.price) : null),
      costPrice: row.cost_price !== null ? Number(row.cost_price) : null,
      sizeValue: row.size_value !== null ? Number(row.size_value) : null,
      sizeUnit: row.size_unit,
      imageUrl: row.image_url,
      imagePublicId: row.image_public_id,
      isAvailable: row.is_available,
      isActive: row.is_active,
      selectedOptions: row.selected_options || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Find a variant by ID
   */
  async findVariantById(variantId, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      SELECT 
        pv.id,
        pv.product_id,
        pv.options_key,
        pv.price,
        pv.compare_at_price,
        pv.size_value,
        pv.size_unit,
        pv.image_url,
        pv.image_public_id,
        pv.is_available,
        pv.is_active,
        p.name AS product_name,
        p.status AS product_status,
        p.stock_quantity AS product_stock,
        p.track_inventory,
        COALESCE(
          json_agg(
            json_build_object(
              'optionName', po.name,
              'value', ov.value
            )
          ) FILTER (WHERE ov.id IS NOT NULL),
          '[]'::json
        ) AS options_summary
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
      LEFT JOIN option_values ov ON ov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = ov.option_id
      WHERE pv.id = $1 AND pv.deleted_at IS NULL
      GROUP BY pv.id, p.id
    `;
    const res = await q(sql, [variantId]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];

    // Build human-friendly variant label, e.g. "Rose / 4 ml"
    const optionsSummary = row.options_summary || [];
    const variantName = optionsSummary.length > 0 
      ? optionsSummary.map((o) => o.value).join(" / ")
      : "";

    return {
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productStatus: row.product_status,
      productStock: Number(row.product_stock || 0),
      trackInventory: row.track_inventory,
      optionsKey: row.options_key,
      variantName,
      price: Number(row.price),
      compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      sizeValue: row.size_value !== null ? Number(row.size_value) : null,
      sizeUnit: row.size_unit,
      imageUrl: row.image_url,
      imagePublicId: row.image_public_id,
      isAvailable: row.is_available,
      isActive: row.is_active,
    };
  }

  /**
   * Find matching variant for a product given a set of option_value_ids
   */
  async findMatchingVariant(productId, optionValueIds = [], client = null) {
    if (!optionValueIds || optionValueIds.length === 0) {
      // Find default variant
      const q = client ? client.query.bind(client) : query;
      const res = await q(
        "SELECT id FROM product_variants WHERE product_id = $1 AND options_key = 'default' AND deleted_at IS NULL LIMIT 1",
        [productId]
      );
      return res.rows[0] ? this.findVariantById(res.rows[0].id, client) : null;
    }

    const q = client ? client.query.bind(client) : query;
    const sql = `
      SELECT vov.variant_id
      FROM variant_option_values vov
      JOIN product_variants pv ON pv.id = vov.variant_id
      WHERE pv.product_id = $1 AND pv.deleted_at IS NULL AND pv.is_active = true
      GROUP BY vov.variant_id
      HAVING array_agg(vov.option_value_id ORDER BY vov.option_value_id)::text[] = 
             (SELECT array_agg(id ORDER BY id)::text[] FROM unnest($2::uuid[]) AS id)
      LIMIT 1
    `;
    const res = await q(sql, [productId, optionValueIds]);
    if (!res.rows[0]) return null;
    return this.findVariantById(res.rows[0].variant_id, client);
  }

  /**
   * Get lowest price among active and available variants for a product
   */
  async getLowestPrice(productId, client = null) {
    const q = client ? client.query.bind(client) : query;
    const sql = `
      SELECT MIN(price) AS min_price, MAX(price) AS max_price, COUNT(*)::int AS variant_count
      FROM product_variants
      WHERE product_id = $1 AND deleted_at IS NULL AND is_active = true
    `;
    const res = await q(sql, [productId]);
    if (!res.rows[0] || res.rows[0].min_price === null) return null;
    return {
      minPrice: Number(res.rows[0].min_price),
      maxPrice: Number(res.rows[0].max_price),
      variantCount: Number(res.rows[0].variant_count),
      hasPriceRange: Number(res.rows[0].min_price) !== Number(res.rows[0].max_price),
    };
  }

  /**
   * Safely delete or deactivate variants during product update.
   * If a variant appears in order_items, deactivate it instead of deleting it.
   */
  async safeDeactivateOrDeleteVariants(productId, currentActiveOptionsKeys = [], client = null) {
    const q = client ? client.query.bind(client) : query;

    // 1. Find variants belonging to this product not in currentActiveOptionsKeys
    let staleVariantsQuery;
    let params;
    if (currentActiveOptionsKeys.length > 0) {
      staleVariantsQuery = `
        SELECT id, options_key FROM product_variants
        WHERE product_id = $1 AND deleted_at IS NULL AND options_key != ALL($2::text[])
      `;
      params = [productId, currentActiveOptionsKeys];
    } else {
      staleVariantsQuery = `
        SELECT id, options_key FROM product_variants
        WHERE product_id = $1 AND deleted_at IS NULL
      `;
      params = [productId];
    }

    const staleRes = await q(staleVariantsQuery, params);
    for (const v of staleRes.rows) {
      // Check if variant is referenced in order_items
      const orderCheck = await q(
        "SELECT id FROM order_items WHERE variant_id = $1 LIMIT 1",
        [v.id]
      );
      if (orderCheck.rows.length > 0) {
        // Referenced in orders: deactivate it, do not delete
        await q(
          "UPDATE product_variants SET is_active = false, is_available = false, updated_at = NOW() WHERE id = $1",
          [v.id]
        );
      } else {
        // Safe to soft-delete
        await q(
          "UPDATE product_variants SET deleted_at = NOW(), is_active = false, is_available = false WHERE id = $1",
          [v.id]
        );
      }
    }
  }
}

module.exports = new VariantRepository();


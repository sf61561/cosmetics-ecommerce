const productRepository = require("../repositories/productRepository");
const variantRepository = require("../repositories/variantRepository");
const { getClient } = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { slugify } = require("../utils/slugHelper");
const { Readable } = require("stream");
const auditService = require("./auditService");

function sanitizeHowToUse(val) {
  if (val === undefined || val === null) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed || null;
  }
  if (Array.isArray(val) || typeof val === "object") {
    return JSON.stringify(val);
  }
  return null;
}

function productAuditSnapshot(product) {
  return {
    name: product.name,
    slug: product.slug,
    brandId: product.brandId ?? product.brand_id ?? product.brand?.id ?? null,
    categoryId: product.categoryId ?? product.category_id ?? product.category?.id ?? null,
    sku: product.sku || null,
    barcode: product.barcode || null,
    price: Number(product.price),
    salePrice: product.salePrice ?? product.sale_price ?? null,
    costPrice: product.costPrice ?? product.cost_price ?? null,
    status: product.status,
    isFeatured: Boolean(product.isFeatured ?? product.is_featured),
    trackInventory: Boolean(product.trackInventory ?? product.track_inventory),
    stockQuantity: Number(product.stockQuantity ?? product.stock_quantity ?? 0),
    lowStockThreshold: Number(product.lowStockThreshold ?? product.low_stock_threshold ?? 5),
    volume: product.volume || null,
    skinType: product.skinType || null,
    countryOfOrigin: product.countryOfOrigin ?? product.country_of_origin ?? null,
  };
}

function changedFields(previous, next, keys) {
  return keys.reduce((result, key) => {
    const before = previous[key] ?? null;
    const after = next[key] ?? null;
    if (before !== after) {
      result.previous[key] = before;
      result.next[key] = after;
    }
    return result;
  }, { previous: {}, next: {} });
}

function formatCloudinaryDeliveryUrl(secureUrl) {
  if (!secureUrl || typeof secureUrl !== "string") return secureUrl;
  if (secureUrl.includes("/image/upload/") && !secureUrl.includes("/image/upload/f_auto,q_auto")) {
    return secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }
  return secureUrl;
}

class ProductService {
  /**
   * Helper: Stream an image buffer to Cloudinary in folder 'eloura/products'
   */
  async uploadToCloudinary(fileBuffer, originalFilename = "product") {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "eloura/products",
          resource_type: "image",
          transformation: [
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            imageUrl: formatCloudinaryDeliveryUrl(result.secure_url),
            imagePublicId: result.public_id,
          });
        }
      );
      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Helper: Delete an asset from Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
    }
  }

  /**
   * Helper: Sync options and variants for a product
   */
  async syncOptionsAndVariants(productId, data, primaryImageUrl, client) {
    let options = [];
    if (Array.isArray(data.options)) {
      options = data.options;
    } else if (typeof data.options === "string") {
      try {
        options = JSON.parse(data.options);
      } catch {
        options = [];
      }
    }

    let variants = [];
    if (Array.isArray(data.variants)) {
      variants = data.variants;
    } else if (typeof data.variants === "string") {
      try {
        variants = JSON.parse(data.variants);
      } catch {
        variants = [];
      }
    }

    const hasCustomVariants = Boolean(
      (data.hasVariants === true || data.hasVariants === "true" || data.hasVariants === 1 || data.hasVariants === "1") &&
      options.length > 0 &&
      variants.length > 0
    );

    if (!hasCustomVariants) {
      // Ensure single default variant
      const baseRegular = Number(data.price || 0);
      const rawSale =
        data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== ""
          ? Number(data.salePrice)
          : data.sale_price !== undefined && data.sale_price !== null && data.sale_price !== ""
          ? Number(data.sale_price)
          : null;
      const hasDiscount = rawSale !== null && !isNaN(rawSale) && rawSale > 0 && rawSale < baseRegular;
      const basePrice = hasDiscount ? rawSale : baseRegular;
      const compareAtPrice = hasDiscount ? baseRegular : null;
      const salePrice = hasDiscount ? rawSale : null;

      const existingRes = await client.query(
        "SELECT id FROM product_variants WHERE product_id = $1 AND options_key = 'default' AND deleted_at IS NULL LIMIT 1",
        [productId]
      );

      if (existingRes.rows.length > 0) {
        await variantRepository.updateVariant(
          existingRes.rows[0].id,
          {
            price: basePrice,
            compareAtPrice,
            regularPrice: baseRegular,
            salePrice,
            sizeValue: data.volume ? parseFloat(data.volume) || null : null,
            sizeUnit: null,
            imageUrl: primaryImageUrl || null,
            isAvailable: true,
            isActive: true,
          },
          client
        );
      } else {
        await variantRepository.createVariant(
          productId,
          {
            optionsKey: "default",
            price: basePrice,
            compareAtPrice,
            regularPrice: baseRegular,
            salePrice,
            sizeValue: data.volume ? parseFloat(data.volume) || null : null,
            sizeUnit: null,
            imageUrl: primaryImageUrl || null,
            isAvailable: true,
            isActive: true,
          },
          client
        );
      }

      await variantRepository.safeDeactivateOrDeleteVariants(productId, ["default"], client);
      return;
    }

    // 1. Sync options and option values
    const activeOptionIds = [];
    const optionValueMap = new Map(); // "optionName:::valueName" and "valueName" -> option_value_id

    for (let oIdx = 0; oIdx < options.length; oIdx++) {
      const opt = options[oIdx];
      if (!opt.name || !String(opt.name).trim()) continue;
      const optName = String(opt.name).trim();

      const createdOpt = await variantRepository.createOption(
        productId,
        {
          name: optName,
          type: opt.type || "button",
          position: opt.position !== undefined ? opt.position : oIdx,
        },
        client
      );
      activeOptionIds.push(createdOpt.id);

      const values = Array.isArray(opt.values) ? opt.values : [];
      for (let vIdx = 0; vIdx < values.length; vIdx++) {
        const val = values[vIdx];
        const valString = typeof val === "string" ? val : val.value;
        if (!valString || !String(valString).trim()) continue;
        const cleanVal = String(valString).trim();

        const swatchHex = typeof val === "object" ? val.swatchHex || val.swatch_hex : null;
        const swatchImage = typeof val === "object" ? val.swatchImage || val.swatch_image : null;
        const swatchImagePublicId = typeof val === "object" ? val.swatchImagePublicId || val.swatch_image_public_id : null;

        const createdVal = await variantRepository.createOptionValue(
          createdOpt.id,
          {
            value: cleanVal,
            swatchHex,
            swatchImage,
            swatchImagePublicId,
            position: vIdx,
          },
          client
        );

        optionValueMap.set(`${optName.toLowerCase()}:::${cleanVal.toLowerCase()}`, createdVal.id);
        optionValueMap.set(cleanVal.toLowerCase(), createdVal.id);
      }
    }

    if (activeOptionIds.length > 0) {
      await client.query(
        "DELETE FROM product_options WHERE product_id = $1 AND id != ALL($2::uuid[])",
        [productId, activeOptionIds]
      );
    }

    // 2. Sync variants
    const activeOptionsKeys = [];
    const defaultIndex = variants.findIndex((v) => Boolean(v.isDefault ?? v.is_default));
    const effectiveDefaultIndex = defaultIndex !== -1 ? defaultIndex : 0;

    for (let idx = 0; idx < variants.length; idx++) {
      const v = variants[idx];
      const optionsKey = v.optionsKey || v.options_key;
      if (!optionsKey) continue;
      activeOptionsKeys.push(optionsKey);

      const isDefault = idx === effectiveDefaultIndex;
      let regularPrice = null;
      let salePrice = null;
      let costPrice = null;
      let price = 0;
      let compareAtPrice = null;

      if (v.regularPrice !== undefined && v.regularPrice !== null && v.regularPrice !== "") {
        regularPrice = Number(v.regularPrice);
        if (v.salePrice !== undefined && v.salePrice !== null && v.salePrice !== "" && Number(v.salePrice) < regularPrice) {
          salePrice = Number(v.salePrice);
          price = salePrice;
          compareAtPrice = regularPrice;
        } else {
          price = regularPrice;
          compareAtPrice = null;
          salePrice = null;
        }
      } else {
        price = Number(v.price || 0);
        compareAtPrice =
          v.compareAtPrice !== null && v.compareAtPrice !== undefined && v.compareAtPrice !== ""
            ? Number(v.compareAtPrice)
            : (v.compare_at_price ? Number(v.compare_at_price) : null);
        regularPrice = compareAtPrice && compareAtPrice > price ? compareAtPrice : price;
        salePrice = compareAtPrice && compareAtPrice > price ? price : null;
      }

      if (v.costPrice !== undefined && v.costPrice !== null && v.costPrice !== "") {
        costPrice = Number(v.costPrice);
      } else if (v.cost_price !== undefined && v.cost_price !== null && v.cost_price !== "") {
        costPrice = Number(v.cost_price);
      }

      const sizeValue = v.sizeValue !== null && v.sizeValue !== undefined && v.sizeValue !== "" ? Number(v.sizeValue) : null;
      const sizeUnit = v.sizeUnit || null;
      const imageUrl = v.imageUrl || v.image_url || primaryImageUrl || null;
      const imagePublicId = v.imagePublicId || v.image_public_id || null;
      const isAvailable =
        v.isAvailable !== undefined
          ? Boolean(v.isAvailable)
          : (v.is_available !== undefined ? Boolean(v.is_available) : true);
      const isActive =
        v.isActive !== undefined
          ? Boolean(v.isActive)
          : (v.is_active !== undefined ? Boolean(v.is_active) : true);

      let variantRow;
      if (v.id) {
        variantRow = await variantRepository.updateVariant(
          v.id,
          { price, compareAtPrice, regularPrice, salePrice, costPrice, sizeValue, sizeUnit, imageUrl, imagePublicId, isAvailable, isActive, isDefault },
          client
        );
      } else {
        const existingRes = await client.query(
          "SELECT id FROM product_variants WHERE product_id = $1 AND options_key = $2 AND deleted_at IS NULL LIMIT 1",
          [productId, optionsKey]
        );
        if (existingRes.rows.length > 0) {
          variantRow = await variantRepository.updateVariant(
            existingRes.rows[0].id,
            { price, compareAtPrice, regularPrice, salePrice, costPrice, sizeValue, sizeUnit, imageUrl, imagePublicId, isAvailable, isActive, isDefault },
            client
          );
        } else {
          variantRow = await variantRepository.createVariant(
            productId,
            { optionsKey, price, compareAtPrice, regularPrice, salePrice, costPrice, sizeValue, sizeUnit, imageUrl, imagePublicId, isAvailable, isActive, isDefault },
            client
          );
        }
      }

      if (variantRow) {
        let optValIds = [];
        if (Array.isArray(v.selectedOptionValueIds) && v.selectedOptionValueIds.length > 0) {
          optValIds = v.selectedOptionValueIds;
        } else if (Array.isArray(v.selectedOptions)) {
          for (const so of v.selectedOptions) {
            if (so.optionValueId) {
              optValIds.push(so.optionValueId);
            } else if (so.optionName && so.value) {
              const matchedId = optionValueMap.get(`${String(so.optionName).toLowerCase()}:::${String(so.value).toLowerCase()}`);
              if (matchedId) optValIds.push(matchedId);
            } else if (typeof so === "string") {
              const matchedId = optionValueMap.get(so.toLowerCase());
              if (matchedId) optValIds.push(matchedId);
            }
          }
        } else if (optionsKey && optionsKey !== "default") {
          const parts = optionsKey.split("/").map((s) => s.trim().toLowerCase());
          for (const p of parts) {
            const matchedId = optionValueMap.get(p);
            if (matchedId) optValIds.push(matchedId);
          }
        }

        await client.query("DELETE FROM variant_option_values WHERE variant_id = $1", [variantRow.id]);
        for (const ovId of optValIds) {
          await variantRepository.linkVariantOptionValue(variantRow.id, ovId, client);
        }
      }
    }

    // 3. Deactivate or delete stale variants
    await variantRepository.safeDeactivateOrDeleteVariants(productId, activeOptionsKeys, client);

    // 4. Update products.price, sale_price and cost_price based on default variant or lowest price
    const defaultRes = await client.query(
      "SELECT price, regular_price, sale_price, cost_price FROM product_variants WHERE product_id = $1 AND is_default = true AND deleted_at IS NULL AND is_active = true LIMIT 1",
      [productId]
    );
    const defaultRow = defaultRes.rows[0];
    const lowest = await variantRepository.getLowestPrice(productId, client);

    const targetPrice = defaultRow
      ? Number(defaultRow.regular_price || defaultRow.price)
      : (lowest?.minPrice !== null && lowest?.minPrice !== undefined ? Number(lowest.minPrice) : null);
    const targetSalePrice = defaultRow?.sale_price !== null && defaultRow?.sale_price !== undefined
      ? Number(defaultRow.sale_price)
      : null;
    const minCostRes = await client.query(
      "SELECT MIN(cost_price) AS min_cost FROM product_variants WHERE product_id = $1 AND deleted_at IS NULL AND is_active = true",
      [productId]
    );
    const minCost = minCostRes.rows[0]?.min_cost ? Number(minCostRes.rows[0].min_cost) : null;
    const targetCostPrice = defaultRow?.cost_price !== null && defaultRow?.cost_price !== undefined
      ? Number(defaultRow.cost_price)
      : minCost;

    if (targetPrice !== null) {
      await client.query(
        "UPDATE products SET price = $2, sale_price = $3, cost_price = COALESCE($4, cost_price) WHERE id = $1",
        [productId, targetPrice, targetSalePrice, targetCostPrice]
      );
    }
  }

  /**
   * List products with pagination, search, filters and summary metrics
   */
  async getProducts(params) {
    const listResult = await productRepository.findProducts(params);
    const summary = await productRepository.getSummaryCounts();
    return {
      products: listResult.products,
      pagination: listResult.pagination,
      summary,
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    if (!id) {
      const error = new Error("Product ID is required.");
      error.status = 400;
      throw error;
    }
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error("Product not found.");
      error.status = 404;
      throw error;
    }
    return product;
  }

  /**
   * Get product by Slug (for public storefront)
   * Strictly enforces active status, published_at <= NOW(), and strips private costPrice
   */
  async getProductBySlug(slug) {
    if (!slug) {
      const error = new Error("Product slug is required.");
      error.status = 400;
      throw error;
    }
    const product = await productRepository.findBySlug(slug);
    if (!product || product.status !== "ACTIVE") {
      const error = new Error("Product not found or is currently unavailable.");
      error.status = 404;
      throw error;
    }
    if (product.published_at && new Date(product.published_at) > new Date()) {
      const error = new Error("Product not found or is currently unavailable.");
      error.status = 404;
      throw error;
    }
    const full = await productRepository.findById(product.id);
    if (!full || full.status !== "ACTIVE") {
      const error = new Error("Product not found or is currently unavailable.");
      error.status = 404;
      throw error;
    }
    const { costPrice, ...publicProduct } = full;
    return publicProduct;
  }

  /**
   * Create a new product (Wrapped in a PostgreSQL Transaction)
   */
  async createProduct(data, imageFiles = [], actor = null, request = null) {
    // 1. Validate required fields
    if (!data.name || !data.name.trim()) {
      const error = new Error("Product name is required.");
      error.status = 400;
      error.field = "name";
      throw error;
    }

    if (data.price === undefined || data.price === null || isNaN(parseFloat(data.price))) {
      const error = new Error("A valid regular price is required.");
      error.status = 400;
      error.field = "price";
      throw error;
    }

    const price = parseFloat(data.price);
    if (price < 0) {
      const error = new Error("Price cannot be negative.");
      error.status = 400;
      error.field = "price";
      throw error;
    }

    let salePrice = null;
    if (data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== "") {
      salePrice = parseFloat(data.salePrice);
      if (isNaN(salePrice) || salePrice < 0) {
        const error = new Error("Sale price must be a valid positive number.");
        error.status = 400;
        error.field = "salePrice";
        throw error;
      }
      if (salePrice > price) {
        const error = new Error("Sale price cannot be higher than the regular price.");
        error.status = 400;
        error.field = "salePrice";
        throw error;
      }
      if (salePrice === price) {
        salePrice = null; // If regular price == sale price, there is no discount price
      }
    }

    let costPrice = null;
    if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== "") {
      costPrice = parseFloat(data.costPrice);
      if (isNaN(costPrice) || costPrice < 0) {
        const error = new Error("Cost price must be a positive number.");
        error.status = 400;
        error.field = "costPrice";
        throw error;
      }
    }

    // 2. Validate / generate slug
    let slug = data.slug ? slugify(data.slug) : slugify(data.name);
    if (!slug) {
      slug = `product-${Date.now()}`;
    }

    const existingSlug = await productRepository.findBySlug(slug);
    if (existingSlug) {
      const error = new Error(`Product slug '${slug}' is already taken.`);
      error.status = 409;
      error.field = "slug";
      throw error;
    }

    // 3. Validate SKU if provided
    let sku = data.sku ? data.sku.trim().toUpperCase() : null;
    if (sku) {
      const existingSku = await productRepository.findBySku(sku);
      if (existingSku) {
        const error = new Error(`SKU '${sku}' is already assigned to another product.`);
        error.status = 409;
        error.field = "sku";
        throw error;
      }
    }

    // 4. Upload attached images to Cloudinary before DB transaction
    const uploadedImages = [];
    if (Array.isArray(imageFiles) && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file && file.buffer) {
          const uploaded = await this.uploadToCloudinary(file.buffer, slug);
          uploadedImages.push({
            imageUrl: uploaded.imageUrl,
            imagePublicId: uploaded.imagePublicId,
            displayOrder: i,
            isPrimary: i === 0,
          });
        }
      }
    }

    // Also support any image URLs sent in JSON (e.g. from standalone upload endpoint)
    if (Array.isArray(data.images) && data.images.length > 0) {
      data.images.forEach((img, idx) => {
        uploadedImages.push({
          imageUrl: img.imageUrl,
          imagePublicId: img.imagePublicId || null,
          displayOrder: uploadedImages.length + idx,
          isPrimary: uploadedImages.length === 0 && idx === 0,
        });
      });
    }

    // Ensure at least one image is marked primary if images exist
    if (uploadedImages.length > 0) {
      const hasPrimary = uploadedImages.some(img => img.isPrimary);
      if (!hasPrimary) {
        uploadedImages[0].isPrimary = true;
      }
    }

    // 5. Database Transaction
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const productPayload = {
        name: data.name.trim(),
        slug,
        brandId: data.brandId || null,
        categoryId: data.categoryId || null,
        sku,
        barcode: data.barcode ? data.barcode.trim() : null,
        shortDescription: data.shortDescription ? data.shortDescription.trim() : null,
        description: data.description ? data.description.trim() : null,
        price,
        salePrice,
        costPrice,
        stockQuantity: parseInt(data.stockQuantity ?? 0, 10),
        lowStockThreshold: parseInt(data.lowStockThreshold ?? 5, 10),
        trackInventory: data.trackInventory !== false && data.trackInventory !== "false",
        status: data.status ? data.status.toUpperCase() : "ACTIVE",
        isFeatured: Boolean(data.isFeatured === true || data.isFeatured === "true"),
        volume: data.volume ? data.volume.trim() : null,
        skinType: data.skinType ? data.skinType.trim() : null,
        skinConcerns: data.skinConcerns ? data.skinConcerns.trim() : null,
        ingredients: data.ingredients ? data.ingredients.trim() : null,
        countryOfOrigin: data.countryOfOrigin ? data.countryOfOrigin.trim() : null,
        howToUse: sanitizeHowToUse(data.howToUse) || null,
        expiryInfo: data.expiryInfo ? data.expiryInfo.trim() : null,
        seoTitle: data.seoTitle ? data.seoTitle.trim() : null,
        seoDescription: data.seoDescription ? data.seoDescription.trim() : null,
      };

      const createdProduct = await productRepository.create(productPayload, client);

      // Save Images
      if (uploadedImages.length > 0) {
        await productRepository.saveImages(createdProduct.id, uploadedImages, client);
      }

      // Sync Collections
      let collectionIds = [];
      if (Array.isArray(data.collectionIds)) {
        collectionIds = data.collectionIds;
      } else if (typeof data.collectionIds === "string") {
        try {
          collectionIds = JSON.parse(data.collectionIds);
        } catch {
          collectionIds = [data.collectionIds];
        }
      }
      await productRepository.syncCollections(createdProduct.id, collectionIds, client);

      // Sync Tags
      let tagIds = [];
      if (Array.isArray(data.tagIds)) {
        tagIds = data.tagIds;
      } else if (typeof data.tagIds === "string") {
        try {
          tagIds = JSON.parse(data.tagIds);
        } catch {
          tagIds = [data.tagIds];
        }
      }
      await productRepository.syncTags(createdProduct.id, tagIds, client);

      // Sync Options and Variants
      const primaryImageUrl = uploadedImages[0]?.imageUrl || null;
      await this.syncOptionsAndVariants(createdProduct.id, data, primaryImageUrl, client);

      await auditService.record({
        actor,
        action: "PRODUCT_CREATED",
        entityType: "PRODUCT",
        entityId: createdProduct.id,
        newValues: {
          name: productPayload.name,
          slug: productPayload.slug,
          price: productPayload.price,
          salePrice: productPayload.salePrice,
          costPrice: productPayload.costPrice,
          status: productPayload.status,
        },
        metadata: { imageCount: uploadedImages.length, collectionCount: collectionIds.length },
      }, { client, request });
      if (productPayload.stockQuantity > 0) {
        await auditService.record({
          actor,
          action: "INVENTORY_ADJUSTED",
          entityType: "INVENTORY",
          entityId: createdProduct.id,
          previousValues: { stockQuantity: 0 },
          newValues: { stockQuantity: productPayload.stockQuantity },
          metadata: { reason: "PRODUCT_CREATED", quantityDelta: productPayload.stockQuantity },
        }, { client, request });
      }

      await client.query("COMMIT");

      return this.getProductById(createdProduct.id);
    } catch (err) {
      await client.query("ROLLBACK");
      // Clean up uploaded Cloudinary assets if DB transaction failed
      for (const img of uploadedImages) {
        if (img.imagePublicId) {
          await this.deleteFromCloudinary(img.imagePublicId);
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing product (Wrapped in a PostgreSQL Transaction)
   */
  async updateProduct(id, data, newImageFiles = [], actor = null, request = null) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      const error = new Error("Product not found.");
      error.status = 404;
      throw error;
    }

    // 1. Validate pricing if changed
    const price = data.price !== undefined ? parseFloat(data.price) : existing.price;
    if (isNaN(price) || price < 0) {
      const error = new Error("Regular price must be a valid non-negative number.");
      error.status = 400;
      error.field = "price";
      throw error;
    }

    let salePrice = existing.salePrice;
    if (data.salePrice !== undefined) {
      if (data.salePrice === null || data.salePrice === "") {
        salePrice = null;
      } else {
        salePrice = parseFloat(data.salePrice);
        if (isNaN(salePrice) || salePrice < 0) {
          const error = new Error("Sale price must be a valid positive number.");
          error.status = 400;
          error.field = "salePrice";
          throw error;
        }
        if (salePrice > price) {
          const error = new Error("Sale price cannot be higher than the regular price.");
          error.status = 400;
          error.field = "salePrice";
          throw error;
        }
        if (salePrice === price) {
          salePrice = null; // If regular price == sale price, there is no discount price
        }
      }
    }

    // 2. Validate slug if changed
    let slug = existing.slug;
    if (data.slug && data.slug.trim()) {
      slug = slugify(data.slug);
      const collision = await productRepository.findBySlug(slug, id);
      if (collision) {
        const error = new Error(`Slug '${slug}' is already taken by another product.`);
        error.status = 409;
        error.field = "slug";
        throw error;
      }
    } else if (data.name && data.name.trim() && !data.slug) {
      // If name changed and slug was not customized
      slug = slugify(data.name);
      const collision = await productRepository.findBySlug(slug, id);
      if (collision) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // 3. Validate SKU if changed
    let sku = existing.sku;
    if (data.sku !== undefined) {
      sku = data.sku ? data.sku.trim().toUpperCase() : null;
      if (sku) {
        const collision = await productRepository.findBySku(sku, id);
        if (collision) {
          const error = new Error(`SKU '${sku}' is already assigned to another product.`);
          error.status = 409;
          error.field = "sku";
          throw error;
        }
      }
    }

    // 4. Upload any new image files to Cloudinary
    const newlyUploadedImages = [];
    if (Array.isArray(newImageFiles) && newImageFiles.length > 0) {
      for (let i = 0; i < newImageFiles.length; i++) {
        const file = newImageFiles[i];
        if (file && file.buffer) {
          const uploaded = await this.uploadToCloudinary(file.buffer, slug);
          newlyUploadedImages.push({
            imageUrl: uploaded.imageUrl,
            imagePublicId: uploaded.imagePublicId,
            displayOrder: 99 + i,
            isPrimary: false,
          });
        }
      }
    }

    // 5. Database Transaction
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const updatePayload = {
        name: data.name ? data.name.trim() : undefined,
        slug,
        brandId: data.brandId !== undefined ? (data.brandId || null) : undefined,
        categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined,
        sku,
        barcode: data.barcode !== undefined ? (data.barcode ? data.barcode.trim() : null) : undefined,
        shortDescription: data.shortDescription !== undefined ? (data.shortDescription ? data.shortDescription.trim() : null) : undefined,
        description: data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined,
        price,
        salePrice,
        costPrice: data.costPrice !== undefined ? (data.costPrice ? parseFloat(data.costPrice) : null) : undefined,
        stockQuantity: data.stockQuantity !== undefined ? parseInt(data.stockQuantity, 10) : undefined,
        lowStockThreshold: data.lowStockThreshold !== undefined ? parseInt(data.lowStockThreshold, 10) : undefined,
        trackInventory: data.trackInventory !== undefined ? (data.trackInventory === true || data.trackInventory === "true") : undefined,
        status: data.status ? data.status.toUpperCase() : undefined,
        isFeatured: data.isFeatured !== undefined ? (data.isFeatured === true || data.isFeatured === "true") : undefined,
        volume: data.volume !== undefined ? (data.volume ? data.volume.trim() : null) : undefined,
        skinType: data.skinType !== undefined ? (data.skinType ? data.skinType.trim() : null) : undefined,
        skinConcerns: data.skinConcerns !== undefined ? (data.skinConcerns ? data.skinConcerns.trim() : null) : undefined,
        ingredients: data.ingredients !== undefined ? (data.ingredients ? data.ingredients.trim() : null) : undefined,
        countryOfOrigin: data.countryOfOrigin !== undefined ? (data.countryOfOrigin ? data.countryOfOrigin.trim() : null) : undefined,
        howToUse: data.howToUse !== undefined ? sanitizeHowToUse(data.howToUse) : undefined,
        expiryInfo: data.expiryInfo !== undefined ? (data.expiryInfo ? data.expiryInfo.trim() : null) : undefined,
        seoTitle: data.seoTitle !== undefined ? (data.seoTitle ? data.seoTitle.trim() : null) : undefined,
        seoDescription: data.seoDescription !== undefined ? (data.seoDescription ? data.seoDescription.trim() : null) : undefined,
      };

      const updatedRow = await productRepository.update(id, updatePayload, client);

      // Handle removed images
      let removedImageIds = [];
      if (Array.isArray(data.removedImageIds)) {
        removedImageIds = data.removedImageIds;
      } else if (typeof data.removedImageIds === "string") {
        try {
          removedImageIds = JSON.parse(data.removedImageIds);
        } catch {
          removedImageIds = [data.removedImageIds];
        }
      }

      if (removedImageIds.length > 0) {
        const deletedRows = await productRepository.removeImages(removedImageIds, client);
        // Clean up Cloudinary assets
        for (const r of deletedRows) {
          if (r.image_public_id) {
            await this.deleteFromCloudinary(r.image_public_id);
          }
        }
      }

      // Save new images
      if (newlyUploadedImages.length > 0) {
        await productRepository.saveImages(id, newlyUploadedImages, client);
      }

      // Handle primary image designation
      if (data.primaryImageId) {
        await client.query("UPDATE product_images SET is_primary = false WHERE product_id = $1", [id]);
        await client.query(
          "UPDATE product_images SET is_primary = true WHERE product_id = $1 AND id = $2",
          [id, data.primaryImageId]
        );
      }

      // Sync Collections
      if (data.collectionIds !== undefined) {
        let collectionIds = [];
        if (Array.isArray(data.collectionIds)) {
          collectionIds = data.collectionIds;
        } else if (typeof data.collectionIds === "string") {
          try {
            collectionIds = JSON.parse(data.collectionIds);
          } catch {
            collectionIds = [data.collectionIds];
          }
        }
        await productRepository.syncCollections(id, collectionIds, client);
      }

      // Sync Tags
      if (data.tagIds !== undefined) {
        let tagIds = [];
        if (Array.isArray(data.tagIds)) {
          tagIds = data.tagIds;
        } else if (typeof data.tagIds === "string") {
          try {
            tagIds = JSON.parse(data.tagIds);
          } catch {
            tagIds = [data.tagIds];
          }
        }
        await productRepository.syncTags(id, tagIds, client);
      }

      // Sync Options and Variants
      const primaryImageUrl =
        newlyUploadedImages[0]?.imageUrl ||
        existing.images?.find((i) => i.isPrimary)?.imageUrl ||
        existing.images?.[0]?.imageUrl ||
        null;
      if (
        data.options !== undefined ||
        data.variants !== undefined ||
        data.hasVariants !== undefined ||
        data.price !== undefined ||
        data.salePrice !== undefined
      ) {
        await this.syncOptionsAndVariants(id, data, primaryImageUrl, client);
      }

      const before = productAuditSnapshot(existing);
      const after = productAuditSnapshot({ ...existing, ...updatePayload, ...(updatedRow || {}) });
      const priceDiff = changedFields(before, after, ["price", "salePrice", "costPrice"]);
      const stockDiff = changedFields(before, after, ["stockQuantity"]);
      const statusDiff = changedFields(before, after, ["status"]);
      const productDiff = changedFields(before, after, ["name", "slug", "brandId", "categoryId", "sku", "barcode", "isFeatured", "trackInventory", "lowStockThreshold", "volume", "skinType", "countryOfOrigin"]);
      if (Object.keys(priceDiff.next).length) {
        await auditService.record({ actor, action: "PRODUCT_PRICE_UPDATED", entityType: "PRODUCT", entityId: id, previousValues: priceDiff.previous, newValues: priceDiff.next }, { client, request });
      }
      if (Object.keys(statusDiff.next).length) {
        await auditService.record({ actor, action: "PRODUCT_STATUS_CHANGED", entityType: "PRODUCT", entityId: id, previousValues: statusDiff.previous, newValues: statusDiff.next }, { client, request });
      }
      if (Object.keys(stockDiff.next).length) {
        await auditService.record({
          actor, action: "INVENTORY_ADJUSTED", entityType: "INVENTORY", entityId: id,
          previousValues: stockDiff.previous, newValues: stockDiff.next,
          metadata: { reason: "ADMIN_ADJUSTMENT", quantityDelta: stockDiff.next.stockQuantity - stockDiff.previous.stockQuantity },
        }, { client, request });
      }
      const removedCount = Array.isArray(removedImageIds) ? removedImageIds.length : 0;
      const imagesChanged = newlyUploadedImages.length > 0 || removedCount > 0 || Boolean(data.primaryImageId);
      const collectionIdsChanged = data.collectionIds !== undefined;
      const contentFields = ["shortDescription", "description", "skinConcerns", "ingredients", "howToUse", "expiryInfo", "seoTitle", "seoDescription"];
      const contentChangedFields = contentFields.filter((field) => updatePayload[field] !== undefined && (existing[field] ?? null) !== (updatePayload[field] ?? null));
      if (Object.keys(productDiff.next).length || contentChangedFields.length || imagesChanged || collectionIdsChanged) {
        const changes = Object.keys(productDiff.next);
        changes.push(...contentChangedFields);
        if (imagesChanged) changes.push("images");
        if (collectionIdsChanged) changes.push("collections");
        await auditService.record({
          actor, action: "PRODUCT_UPDATED", entityType: "PRODUCT", entityId: id,
          previousValues: { ...productDiff.previous, ...(contentChangedFields.length ? { contentChanged: false } : {}) },
          newValues: { ...productDiff.next, ...(contentChangedFields.length ? { contentChanged: true } : {}), ...(imagesChanged ? { imagesChanged: true } : {}), ...(collectionIdsChanged ? { collectionsChanged: true } : {}) },
          metadata: { changedFields: changes, contentFieldsChanged: contentChangedFields, addedImageCount: newlyUploadedImages.length, removedImageCount: removedCount },
        }, { client, request });
      }

      await client.query("COMMIT");

      return this.getProductById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      // Clean up newly uploaded Cloudinary assets if update failed
      for (const img of newlyUploadedImages) {
        if (img.imagePublicId) {
          await this.deleteFromCloudinary(img.imagePublicId);
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fast status toggle (ACTIVE / DRAFT / ARCHIVED)
   */
  async updateStatus(id, status, actor = null, request = null) {
    const validStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
    const upper = status ? status.toUpperCase() : "";
    if (!validStatuses.includes(upper)) {
      const error = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}`);
      error.status = 400;
      throw error;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const previous = await client.query("SELECT status FROM products WHERE id = $1 FOR UPDATE", [id]);
      if (!previous.rows[0]) {
        await client.query("ROLLBACK");
        const error = new Error("Product not found.");
        error.status = 404;
        throw error;
      }
      const updated = await productRepository.updateStatus(id, upper, client);
      if (previous.rows[0].status !== upper) {
        await auditService.record({ actor, action: "PRODUCT_STATUS_CHANGED", entityType: "PRODUCT", entityId: id, previousValues: { status: previous.rows[0].status }, newValues: { status: upper } }, { client, request });
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recently published customer-facing new arrivals
   * Limit bounds: 1 to 24 (default 8)
   */
  async getNewArrivals(limit = 8) {
    const limitNum = Math.min(24, Math.max(1, parseInt(limit, 10) || 8));
    return productRepository.getNewArrivals(limitNum);
  }

  /**
   * Delete a product and remove all associated Cloudinary images
   */
  async deleteProduct(id, actor = null, request = null) {
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error("Product not found.");
      error.status = 404;
      throw error;
    }

    const client = await getClient();
    let result;
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT name, slug, price, sale_price, status FROM products WHERE id = $1 FOR UPDATE", [id]);
      if (!locked.rows[0]) {
        await client.query("ROLLBACK");
        const error = new Error("Product not found.");
        error.status = 404;
        throw error;
      }
      result = await productRepository.delete(id, client);
      await auditService.record({
        actor,
        action: "PRODUCT_DELETED",
        entityType: "PRODUCT",
        entityId: id,
        previousValues: { name: locked.rows[0].name, slug: locked.rows[0].slug, price: Number(locked.rows[0].price), salePrice: locked.rows[0].sale_price === null ? null : Number(locked.rows[0].sale_price), status: locked.rows[0].status },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Clean up Cloudinary assets
    if (result.imagePublicIds && result.imagePublicIds.length > 0) {
      for (const pid of result.imagePublicIds) {
        await this.deleteFromCloudinary(pid);
      }
    }

    return {
      message: `Product '${product.name}' was successfully deleted.`,
      id,
    };
  }
}

module.exports = new ProductService();


const brandRepository = require("../repositories/brandRepository");
const cloudinaryService = require("./cloudinaryService");
const { generateSlug, isValidSlug } = require("../utils/slugHelper");
const { getClient } = require("../config/db");
const auditService = require("./auditService");

// Helper to validate UUID v4
const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// Helper to sanitize website URL
const sanitizeUrl = (url) => {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const brandService = {
  /**
   * List brands with filters, pagination, and real-time summary statistics
   */
  async getBrands({
    search = "",
    status = "all",
    isFeatured = "all",
    letter = "",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const [brands, totalFiltered, summary] = await Promise.all([
      brandRepository.findAll({
        search,
        status,
        isFeatured,
        letter,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      brandRepository.countFiltered({ search, status, isFeatured, letter }),
      brandRepository.getSummaryCounts(),
    ]);

    const totalPages = Math.ceil(totalFiltered / limitNum) || 1;

    // Transform database fields to camelCase
    const formattedBrands = brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      tagline: b.tagline || "",
      description: b.description || "",
      logoUrl: b.logo_url || null,
      logoPublicId: b.logo_public_id || null,
      websiteUrl: b.website_url || null,
      isActive: Boolean(b.is_active),
      isFeatured: Boolean(b.is_featured),
      salesCount: parseInt(b.sales_count, 10) || 0,
      productCount: parseInt(b.product_count, 10) || 0,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return {
      brands: formattedBrands,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: totalFiltered,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      summary: {
        total: summary.total || 0,
        active: summary.active || 0,
        inactive: summary.inactive || 0,
        featured: summary.featured || 0,
        totalProducts: summary.totalProducts || 0,
      },
    };
  },

  /**
   * Retrieve active brands ranked by delivered product units, with zero-sales brands included.
   */
  async getTopBrands(limit = 3) {
    const limitNum = Math.max(1, Math.min(20, parseInt(limit, 10) || 3));
    const brands = await brandRepository.getTopBrands(limitNum);

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      tagline: b.tagline || "",
      description: b.description || "",
      logoUrl: b.logo_url || null,
      logoPublicId: b.logo_public_id || null,
      websiteUrl: b.website_url || null,
      isActive: Boolean(b.is_active),
      isFeatured: Boolean(b.is_featured),
      salesCount: parseInt(b.sales_count, 10) || 0,
      productCount: parseInt(b.product_count, 10) || 0,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  },

  /**
   * Get single brand by ID
   */
  async getBrandById(id) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid brand ID format.");
      error.statusCode = 400;
      throw error;
    }

    const b = await brandRepository.findById(id);
    if (!b) {
      const error = new Error("Brand not found.");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      tagline: b.tagline || "",
      description: b.description || "",
      logoUrl: b.logo_url || null,
      logoPublicId: b.logo_public_id || null,
      websiteUrl: b.website_url || null,
      isActive: Boolean(b.is_active),
      isFeatured: Boolean(b.is_featured),
      salesCount: parseInt(b.sales_count, 10) || 0,
      productCount: parseInt(b.product_count, 10) || 0,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    };
  },

  /**
   * Create a new brand
   */
  async createBrand(data, file = null, actor = null, request = null) {
    const { name, description = "" } = data;

    if (!name || typeof name !== "string" || !name.trim()) {
      const error = new Error("Brand name is required.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 150) {
      const error = new Error("Brand name must be between 2 and 150 characters.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    // Determine slug: either provided or auto-generated
    let cleanSlug = data.slug && typeof data.slug === "string" && data.slug.trim()
      ? generateSlug(data.slug)
      : generateSlug(cleanName);

    if (!cleanSlug) {
      cleanSlug = `brand-${Date.now()}`;
    }

    if (!isValidSlug(cleanSlug)) {
      const error = new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens.");
      error.statusCode = 400;
      error.field = "slug";
      throw error;
    }

    // Check duplicate slug in database
    const existing = await brandRepository.findBySlug(cleanSlug);
    if (existing) {
      const error = new Error(
        `A brand with the slug "${cleanSlug}" already exists. Please choose a different name or slug.`
      );
      error.statusCode = 409;
      error.field = "slug";
      throw error;
    }

    // Handle logo upload if attached
    let logoUrl = data.logoUrl || null;
    let logoPublicId = data.logoPublicId || null;

    if (file && file.buffer) {
      try {
        const uploadRes = await cloudinaryService.uploadImage(file.buffer, "eloura/brands");
        logoUrl = uploadRes.url;
        logoPublicId = uploadRes.publicId;
      } catch (uploadErr) {
        const error = new Error(`Logo upload failed: ${uploadErr.message}`);
        error.statusCode = 502;
        throw error;
      }
    }

    // Parse boolean status & featured
    const isActive =
      data.isActive === true ||
      data.isActive === "true" ||
      data.isActive === 1 ||
      data.isActive === "1" ||
      data.isActive === undefined;

    const isFeatured =
      data.isFeatured === true ||
      data.isFeatured === "true" ||
      data.isFeatured === 1 ||
      data.isFeatured === "1";

    const websiteUrl = sanitizeUrl(data.websiteUrl);

    const client = await getClient();
    let newRecord;
    try {
      await client.query("BEGIN");
      newRecord = await brandRepository.create({
        name: cleanName, slug: cleanSlug,
        description: typeof description === "string" ? description.trim() : null,
        logoUrl, logoPublicId, websiteUrl, isActive, isFeatured,
      }, client);
      await auditService.record({
        actor, action: "BRAND_CREATED", entityType: "BRAND", entityId: newRecord.id,
        newValues: { name: newRecord.name, slug: newRecord.slug, isActive: Boolean(newRecord.is_active), isFeatured: Boolean(newRecord.is_featured) },
        metadata: { logoAttached: Boolean(logoUrl) },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return {
      id: newRecord.id,
      name: newRecord.name,
      slug: newRecord.slug,
      description: newRecord.description || "",
      logoUrl: newRecord.logo_url,
      logoPublicId: newRecord.logo_public_id,
      websiteUrl: newRecord.website_url,
      isActive: Boolean(newRecord.is_active),
      isFeatured: Boolean(newRecord.is_featured),
      productCount: 0,
      createdAt: newRecord.created_at,
      updatedAt: newRecord.updated_at,
    };
  },

  /**
   * Update an existing brand
   */
  async updateBrand(id, data, file = null, actor = null, request = null) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid brand ID format.");
      error.statusCode = 400;
      throw error;
    }

    const existing = await brandRepository.findById(id);
    if (!existing) {
      const error = new Error("Brand not found.");
      error.statusCode = 404;
      throw error;
    }

    const updates = {};

    // Validate name if provided
    if (data.name !== undefined) {
      const cleanName = typeof data.name === "string" ? data.name.trim() : "";
      if (!cleanName || cleanName.length < 2 || cleanName.length > 150) {
        const error = new Error("Brand name must be between 2 and 150 characters.");
        error.statusCode = 400;
        error.field = "name";
        throw error;
      }
      updates.name = cleanName;
    }

    // Validate slug if provided
    if (data.slug !== undefined) {
      const cleanSlug = generateSlug(data.slug);
      if (!cleanSlug || !isValidSlug(cleanSlug)) {
        const error = new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens.");
        error.statusCode = 400;
        error.field = "slug";
        throw error;
      }

      // Check collision with other brands
      const collision = await brandRepository.findBySlug(cleanSlug, id);
      if (collision) {
        const error = new Error(
          `A brand with the slug "${cleanSlug}" already exists. Please choose a different slug.`
        );
        error.statusCode = 409;
        error.field = "slug";
        throw error;
      }
      updates.slug = cleanSlug;
    }

    // Description
    if (data.description !== undefined) {
      updates.description =
        typeof data.description === "string" ? data.description.trim() : null;
    }

    // Website URL
    if (data.websiteUrl !== undefined) {
      updates.websiteUrl = sanitizeUrl(data.websiteUrl);
    }

    // Active status
    if (data.isActive !== undefined) {
      updates.isActive =
        data.isActive === true ||
        data.isActive === "true" ||
        data.isActive === 1 ||
        data.isActive === "1";
    }

    // Featured status
    if (data.isFeatured !== undefined) {
      updates.isFeatured =
        data.isFeatured === true ||
        data.isFeatured === "true" ||
        data.isFeatured === 1 ||
        data.isFeatured === "1";
    }

    // File upload (logo replacement)
    if (file && file.buffer) {
      try {
        const uploadRes = await cloudinaryService.uploadImage(file.buffer, "eloura/brands");
        updates.logoUrl = uploadRes.url;
        updates.logoPublicId = uploadRes.publicId;

        // Safely destroy previous Cloudinary asset if existed
        if (existing.logo_public_id) {
          cloudinaryService.deleteImage(existing.logo_public_id).catch(() => {});
        }
      } catch (uploadErr) {
        const error = new Error(`Logo upload failed: ${uploadErr.message}`);
        error.statusCode = 502;
        throw error;
      }
    }

    const client = await getClient();
    let updatedRecord;
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT id FROM brands WHERE id = $1 FOR UPDATE", [id]);
      if (!locked.rows[0]) {
        const error = new Error("Brand not found.");
        error.statusCode = 404;
        throw error;
      }
      updatedRecord = await brandRepository.update(id, updates, client);
      const before = { name: existing.name, slug: existing.slug, websiteUrl: existing.website_url, isActive: Boolean(existing.is_active), isFeatured: Boolean(existing.is_featured) };
      const after = { name: updatedRecord.name, slug: updatedRecord.slug, websiteUrl: updatedRecord.website_url, isActive: Boolean(updatedRecord.is_active), isFeatured: Boolean(updatedRecord.is_featured) };
      const changed = Object.keys(after).filter((key) => before[key] !== after[key]);
      const logoChanged = updates.logoUrl !== undefined;
      if (changed.length || logoChanged) {
        await auditService.record({
          actor, action: "BRAND_UPDATED", entityType: "BRAND", entityId: id,
          previousValues: Object.fromEntries(changed.map((key) => [key, before[key]])),
          newValues: { ...Object.fromEntries(changed.map((key) => [key, after[key]])), ...(logoChanged ? { logoChanged: true } : {}) },
          metadata: { changedFields: [...changed, ...(logoChanged ? ["logo"] : [])] },
        }, { client, request });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return {
      id: updatedRecord.id,
      name: updatedRecord.name,
      slug: updatedRecord.slug,
      description: updatedRecord.description || "",
      logoUrl: updatedRecord.logo_url,
      logoPublicId: updatedRecord.logo_public_id,
      websiteUrl: updatedRecord.website_url,
      isActive: Boolean(updatedRecord.is_active),
      isFeatured: Boolean(updatedRecord.is_featured),
      productCount: parseInt(existing.product_count, 10) || 0,
      createdAt: updatedRecord.created_at,
      updatedAt: updatedRecord.updated_at,
    };
  },

  /**
   * Delete a brand
   */
  async deleteBrand(id, actor = null, request = null) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid brand ID format.");
      error.statusCode = 400;
      throw error;
    }

    const brand = await brandRepository.findById(id);
    if (!brand) {
      const error = new Error("Brand not found.");
      error.statusCode = 404;
      throw error;
    }

    // Restrict deletion if brand has linked products
    const hasProducts = await brandRepository.hasLinkedProducts(id);
    if (hasProducts || (brand.product_count && parseInt(brand.product_count, 10) > 0)) {
      const error = new Error(
        `Cannot delete brand "${brand.name}" because it currently has associated products. Please reassign or remove the products first, or deactivate the brand instead.`
      );
      error.statusCode = 400;
      error.isAssociated = true;
      throw error;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const deleted = await brandRepository.delete(id, client);
      if (!deleted) {
        const error = new Error("Brand not found.");
        error.statusCode = 404;
        throw error;
      }
      await auditService.record({
        actor, action: "BRAND_DELETED", entityType: "BRAND", entityId: id,
        previousValues: { name: brand.name, slug: brand.slug, isActive: Boolean(brand.is_active), isFeatured: Boolean(brand.is_featured) },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (brand.logo_public_id) await cloudinaryService.deleteImage(brand.logo_public_id);

    return {
      success: true,
      message: `Brand "${brand.name}" has been permanently deleted.`,
    };
  },
};

module.exports = brandService;


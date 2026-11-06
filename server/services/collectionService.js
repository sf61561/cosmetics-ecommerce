const collectionRepository = require("../repositories/collectionRepository");
const cloudinaryService = require("./cloudinaryService");
const { generateSlug, isValidSlug } = require("../utils/slugHelper");
const { getClient } = require("../config/db");
const auditService = require("./auditService");

// Helper to validate UUID v4
const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const collectionService = {
  /**
   * List collections with filters, pagination, and real-time summary statistics
   */
  async getCollections({
    search = "",
    status = "all",
    tag = "",
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const [collections, totalFiltered, summary] = await Promise.all([
      collectionRepository.findAll({
        search,
        status,
        tag,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
      }),
      collectionRepository.countFiltered({ search, status, tag }),
      collectionRepository.getSummaryCounts(),
    ]);

    const totalPages = Math.ceil(totalFiltered / limitNum) || 1;

    // Transform database fields to camelCase
    const formattedCollections = collections.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description || "",
      imageUrl: col.image_url || null,
      imagePublicId: col.image_public_id || null,
      isActive: Boolean(col.is_active),
      salesCount: parseInt(col.sales_count, 10) || 0,
      isFeatured: Boolean(col.is_featured),
      displayOrder: parseInt(col.display_order, 10) || 0,
      productCount: parseInt(col.product_count, 10) || 0,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
    }));

    return {
      collections: formattedCollections,
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
      },
    };
  },

  /**
   * Get a single collection by ID
   */
  async getCollectionById(id) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid collection ID format.");
      error.statusCode = 400;
      throw error;
    }

    const col = await collectionRepository.findById(id);
    if (!col) {
      const error = new Error("Collection not found.");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description || "",
      imageUrl: col.image_url || null,
      imagePublicId: col.image_public_id || null,
      isActive: Boolean(col.is_active),
      productCount: parseInt(col.product_count, 10) || 0,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
    };
  },

  /**
   * Create a new collection
   */
  async createCollection(data, file = null, actor = null, request = null) {
    const { name, description = "" } = data;

    if (!name || typeof name !== "string" || !name.trim()) {
      const error = new Error("Collection name is required.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 150) {
      const error = new Error("Collection name must be between 2 and 150 characters.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    // Determine slug: either user-provided or auto-generated from name
    let cleanSlug = data.slug && typeof data.slug === "string" && data.slug.trim()
      ? generateSlug(data.slug)
      : generateSlug(cleanName);

    if (!cleanSlug) {
      cleanSlug = `collection-${Date.now()}`;
    }

    if (!isValidSlug(cleanSlug)) {
      const error = new Error("Invalid slug format. Use lowercase letters, numbers, and hyphens.");
      error.statusCode = 400;
      error.field = "slug";
      throw error;
    }

    // Check duplicate slug in database
    const existing = await collectionRepository.findBySlug(cleanSlug);
    if (existing) {
      const error = new Error(
        `A collection with the slug "${cleanSlug}" already exists. Please choose a different name or slug.`
      );
      error.statusCode = 409;
      error.field = "slug";
      throw error;
    }

    // Handle image upload if a file was attached
    let imageUrl = data.imageUrl || null;
    let imagePublicId = data.imagePublicId || null;

    if (file && file.buffer) {
      try {
        const uploadRes = await cloudinaryService.uploadImage(
          file.buffer,
          "eloura/collections"
        );
        imageUrl = uploadRes.url;
        imagePublicId = uploadRes.publicId;
      } catch (uploadErr) {
        const error = new Error(`Image upload failed: ${uploadErr.message}`);
        error.statusCode = 502;
        throw error;
      }
    }

    // Parse boolean status
    const isActive =
      data.isActive === true ||
      data.isActive === "true" ||
      data.isActive === 1 ||
      data.isActive === "1" ||
      data.isActive === undefined;

    const client = await getClient();
    let newRecord;
    try {
      await client.query("BEGIN");
      newRecord = await collectionRepository.create({
        name: cleanName, slug: cleanSlug,
        description: typeof description === "string" ? description.trim() : null,
        imageUrl, imagePublicId, isActive,
      }, client);
      await auditService.record({
        actor, action: "COLLECTION_CREATED", entityType: "COLLECTION", entityId: newRecord.id,
        newValues: { name: newRecord.name, slug: newRecord.slug, isActive: Boolean(newRecord.is_active) },
        metadata: { imageAttached: Boolean(imageUrl) },
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
      imageUrl: newRecord.image_url,
      imagePublicId: newRecord.image_public_id,
      isActive: Boolean(newRecord.is_active),
      productCount: 0,
      createdAt: newRecord.created_at,
      updatedAt: newRecord.updated_at,
    };
  },

  /**
   * Update an existing collection
   */
  async updateCollection(id, data, file = null, actor = null, request = null) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid collection ID format.");
      error.statusCode = 400;
      throw error;
    }

    const existing = await collectionRepository.findById(id);
    if (!existing) {
      const error = new Error("Collection not found.");
      error.statusCode = 404;
      throw error;
    }

    const updates = {};

    // Validate name if provided
    if (data.name !== undefined) {
      const cleanName = typeof data.name === "string" ? data.name.trim() : "";
      if (!cleanName || cleanName.length < 2 || cleanName.length > 150) {
        const error = new Error("Collection name must be between 2 and 150 characters.");
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

      // Check uniqueness excluding current collection
      const slugCollision = await collectionRepository.findBySlug(cleanSlug, id);
      if (slugCollision) {
        const error = new Error(
          `A collection with the slug "${cleanSlug}" already exists. Please choose a different slug.`
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

    // Status
    if (data.isActive !== undefined) {
      updates.isActive =
        data.isActive === true ||
        data.isActive === "true" ||
        data.isActive === 1 ||
        data.isActive === "1";
    }

    // Handle new file upload or image removal
    const oldPublicId = existing.image_public_id;

    if (file && file.buffer) {
      try {
        const uploadRes = await cloudinaryService.uploadImage(
          file.buffer,
          "eloura/collections"
        );
        updates.imageUrl = uploadRes.url;
        updates.imagePublicId = uploadRes.publicId;

        // Clean up old Cloudinary asset if safe
        if (oldPublicId && oldPublicId !== uploadRes.publicId) {
          const isReferenced = await collectionRepository.isImageReferencedElsewhere(
            oldPublicId,
            id
          );
          if (!isReferenced) {
            await cloudinaryService.deleteImage(oldPublicId);
          }
        }
      } catch (uploadErr) {
        const error = new Error(`Image upload failed: ${uploadErr.message}`);
        error.statusCode = 502;
        throw error;
      }
    } else if (data.removeImage === true || data.removeImage === "true") {
      updates.imageUrl = null;
      updates.imagePublicId = null;

      if (oldPublicId) {
        const isReferenced = await collectionRepository.isImageReferencedElsewhere(
          oldPublicId,
          id
        );
        if (!isReferenced) {
          await cloudinaryService.deleteImage(oldPublicId);
        }
      }
    }

    const client = await getClient();
    let updated;
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT id FROM collections WHERE id = $1 FOR UPDATE", [id]);
      if (!locked.rows[0]) {
        const error = new Error("Collection not found.");
        error.statusCode = 404;
        throw error;
      }
      updated = await collectionRepository.update(id, updates, client);
      const before = { name: existing.name, slug: existing.slug, isActive: Boolean(existing.is_active) };
      const after = { name: updated.name, slug: updated.slug, isActive: Boolean(updated.is_active) };
      const changed = Object.keys(after).filter((key) => before[key] !== after[key]);
      const imageChanged = updates.imageUrl !== undefined;
      if (changed.length || imageChanged) {
        await auditService.record({
          actor, action: "COLLECTION_UPDATED", entityType: "COLLECTION", entityId: id,
          previousValues: Object.fromEntries(changed.map((key) => [key, before[key]])),
          newValues: { ...Object.fromEntries(changed.map((key) => [key, after[key]])), ...(imageChanged ? { imageChanged: true } : {}) },
          metadata: { changedFields: [...changed, ...(imageChanged ? ["image"] : [])] },
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
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description || "",
      imageUrl: updated.image_url,
      imagePublicId: updated.image_public_id,
      isActive: Boolean(updated.is_active),
      productCount: parseInt(existing.product_count, 10) || 0,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },

  /**
   * Delete a collection
   */
  async deleteCollection(id, actor = null, request = null) {
    if (!id || !isUUID(id)) {
      const error = new Error("Invalid collection ID format.");
      error.statusCode = 400;
      throw error;
    }

    const existing = await collectionRepository.findById(id);
    if (!existing) {
      const error = new Error("Collection not found.");
      error.statusCode = 404;
      throw error;
    }

    // Prevent accidental deletion if products are associated
    const productCount = parseInt(existing.product_count, 10) || 0;
    if (productCount > 0) {
      const error = new Error(
        `Cannot delete collection "${existing.name}" because it contains ${productCount} associated product(s). Please remove or reassign the products first, or mark the collection as Inactive instead.`
      );
      error.statusCode = 400;
      error.code = "COLLECTION_HAS_PRODUCTS";
      error.productCount = productCount;
      throw error;
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      const deleted = await collectionRepository.delete(id, client);
      if (!deleted) {
        const error = new Error("Collection not found.");
        error.statusCode = 404;
        throw error;
      }
      await auditService.record({
        actor, action: "COLLECTION_DELETED", entityType: "COLLECTION", entityId: id,
        previousValues: { name: existing.name, slug: existing.slug, isActive: Boolean(existing.is_active) },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Clean up Cloudinary asset if not referenced by any other collection
    if (existing.image_public_id) {
      const isReferenced = await collectionRepository.isImageReferencedElsewhere(
        existing.image_public_id,
        id
      );
      if (!isReferenced) {
        await cloudinaryService.deleteImage(existing.image_public_id);
      }
    }

    return {
      success: true,
      message: `Collection "${existing.name}" deleted successfully.`,
      id: existing.id,
    };
  },
};

module.exports = collectionService;


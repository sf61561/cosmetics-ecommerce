const express = require("express");
const router = express.Router();
const collectionService = require("../services/collectionService");
const collectionRepository = require("../repositories/collectionRepository");
const optionalAuth = require("../middlewares/optionalAuth");
const { attachPreviewContext } = require("../middlewares/previewMiddleware");

/**
 * GET /api/collections
 * Public endpoint to list active collections (supports limit, search, sorting).
 * Verified preview sessions with storefront.preview_drafts also receive inactive drafts flagged isDraft=true.
 */
router.get("/", optionalAuth, attachPreviewContext, async (req, res, next) => {
  try {
    const {
      limit = 12,
      page = 1,
      sortBy = "sales_count",
      sortOrder = "DESC",
      search = "",
      tag = "",
    } = req.query;

    const includeDrafts = Boolean(req.storefrontPreview?.canPreviewDrafts);

    const result = await collectionService.getCollections({
      search,
      tag,
      status: includeDrafts ? "all" : "active",
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 12,
      sortBy: sortBy === "popularity" || sortBy === "sales" ? "sales_count" : sortBy,
      sortOrder: sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC",
    });

    const data = includeDrafts
      ? result.collections.map((c) => ({ ...c, isDraft: !c.isActive }))
      : result.collections;

    return res.status(200).json({
      success: true,
      data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/collections/top
 * Convenience endpoint to retrieve top 3 most sales collections
 */
router.get("/top", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 3;
    const result = await collectionService.getCollections({
      status: "active",
      page: 1,
      limit,
      sortBy: "sales_count",
      sortOrder: "DESC",
    });

    return res.status(200).json({
      success: true,
      data: result.collections,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/collections/:slug
 * Public endpoint to fetch an active collection with its products (or drafts in authorized preview)
 */
router.get("/:slug", optionalAuth, attachPreviewContext, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const includeDrafts = Boolean(req.storefrontPreview?.canPreviewDrafts);
    const collection = await collectionRepository.findPublicBySlug(slug, { includeDrafts });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


const express = require("express");
const router = express.Router();
const collectionService = require("../services/collectionService");
const collectionRepository = require("../repositories/collectionRepository");

/**
 * GET /api/collections
 * Public endpoint to list active collections (supports limit, search, sorting)
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      limit = 12,
      page = 1,
      sortBy = "sales_count",
      sortOrder = "DESC",
      search = "",
      tag = "",
    } = req.query;

    const result = await collectionService.getCollections({
      search,
      tag,
      status: "active",
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 12,
      sortBy: sortBy === "popularity" || sortBy === "sales" ? "sales_count" : sortBy,
      sortOrder: sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC",
    });

    return res.status(200).json({
      success: true,
      data: result.collections,
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
 * Public endpoint to fetch an active collection with its products
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const collection = await collectionRepository.findPublicBySlug(slug);

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


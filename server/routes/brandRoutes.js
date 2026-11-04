const express = require("express");
const router = express.Router();
const brandService = require("../services/brandService");
const brandRepository = require("../repositories/brandRepository");

/**
 * GET /api/brands
 * Public endpoint to list active brands (supports letter filter, search, sorting)
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      featured,
      letter = "",
      search = "",
      limit = 50,
      page = 1,
      sortBy = "name",
      sortOrder = "ASC",
    } = req.query;

    const isFeatured = featured === "true" || featured === true ? true : "all";

    const result = await brandService.getBrands({
      search,
      letter,
      status: "active",
      isFeatured,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      sortBy: sortBy === "popularity" || sortBy === "sales" ? "sales_count" : sortBy,
      sortOrder: sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC",
    });

    return res.status(200).json({
      success: true,
      data: result.brands,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/brands/top
 * Return active brands ranked by delivered units, including zero-sales brands.
 */
router.get("/top", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 3;
    const brands = await brandService.getTopBrands(limit);

    return res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/brands/:slug
 * Public endpoint to get a single active brand by slug
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const brand = await brandRepository.findBySlug(slug);

    if (!brand || !brand.is_active) {
      return res.status(404).json({
        success: false,
        message: "Brand not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        tagline: brand.tagline || "",
        description: brand.description || "",
        logoUrl: brand.logo_url || null,
        websiteUrl: brand.website_url || null,
        isFeatured: Boolean(brand.is_featured),
        salesCount: parseInt(brand.sales_count, 10) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


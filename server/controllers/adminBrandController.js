const brandService = require("../services/brandService");

class AdminBrandController {
  /**
   * GET /api/admin/brands
   */
  async list(req, res, next) {
    try {
      const {
        search = "",
        status = "all",
        isFeatured = req.query.featured !== undefined ? req.query.featured : (req.query.isFeatured || "all"),
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const result = await brandService.getBrands({
        search,
        status,
        isFeatured,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json({
        success: true,
        data: result.brands,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/brands/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const brand = await brandService.getBrandById(id);

      return res.status(200).json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/brands
   */
  async create(req, res, next) {
    try {
      const brandData = req.body || {};
      const file = req.file || null;

      const newBrand = await brandService.createBrand(brandData, file, req.user, req.auditRequest);

      return res.status(201).json({
        success: true,
        message: "Brand created successfully.",
        data: newBrand,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/brands/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const brandData = req.body || {};
      const file = req.file || null;

      const updatedBrand = await brandService.updateBrand(id, brandData, file, req.user, req.auditRequest);

      return res.status(200).json({
        success: true,
        message: "Brand updated successfully.",
        data: updatedBrand,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/brands/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await brandService.deleteBrand(id, req.user, req.auditRequest);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminBrandController();

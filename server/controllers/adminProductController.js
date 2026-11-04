const productService = require("../services/productService");
const categoryRepository = require("../repositories/categoryRepository");

class AdminProductController {
  /**
   * GET /api/admin/products
   */
  async list(req, res, next) {
    try {
      const {
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
      } = req.query;

      const result = await productService.getProducts({
        search,
        status,
        brandId,
        categoryId,
        collectionId,
        stockStatus,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/products/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/products
   */
  async create(req, res, next) {
    try {
      const imageFiles = req.files || [];
      const productData = req.body;

      const newProduct = await productService.createProduct(productData, imageFiles, req.user, req.auditRequest);

      return res.status(201).json({
        success: true,
        message: "Product created successfully.",
        data: newProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/products/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const newImageFiles = req.files || [];
      const productData = req.body;

      const updatedProduct = await productService.updateProduct(id, productData, newImageFiles, req.user, req.auditRequest);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully.",
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/products/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await productService.updateStatus(id, status, req.user, req.auditRequest);

      return res.status(200).json({
        success: true,
        message: `Product status updated to '${updated.status}'.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/products/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await productService.deleteProduct(id, req.user, req.auditRequest);

      return res.status(200).json({
        success: true,
        message: result.message,
        id: result.id,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/products/upload-images
   * Standalone endpoint to upload multiple product images to Cloudinary
   */
  async uploadImages(req, res, next) {
    try {
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No image files provided.",
        });
      }

      const uploadResults = [];
      for (const file of files) {
        const uploaded = await productService.uploadToCloudinary(file.buffer, "prod-temp");
        uploadResults.push({
          imageUrl: uploaded.imageUrl,
          imagePublicId: uploaded.imagePublicId,
          originalName: file.originalname,
        });
      }

      return res.status(200).json({
        success: true,
        message: `${uploadResults.length} image(s) uploaded successfully.`,
        data: uploadResults,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/products/categories/all
   */
  async getCategories(req, res, next) {
    try {
      const categories = await categoryRepository.findAll();
      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminProductController();


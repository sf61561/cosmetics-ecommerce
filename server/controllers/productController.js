const productService = require("../services/productService");
const categoryRepository = require("../repositories/categoryRepository");

class ProductController {
  /**
   * GET /api/products
   * Public storefront catalog
   */
  async list(req, res, next) {
    try {
      const {
        search = "",
        brandId = "all",
        categoryId = "all",
        collectionId = "all",
        page = 1,
        limit = 12,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const includeDrafts = Boolean(req.storefrontPreview?.canPreviewDrafts);

      // Public catalog only shows ACTIVE products unless verified draft preview is enabled
      const result = await productService.getProducts({
        search,
        status: includeDrafts ? "all" : "ACTIVE",
        brandId,
        categoryId,
        collectionId,
        stockStatus: "all",
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const sanitized = (result.products || []).map((item) => {
        const publicItem = productService.stripPublicPrivateFields(item);
        if (includeDrafts) {
          publicItem.isDraft =
            item.status !== "ACTIVE" ||
            (item.publishedAt ? new Date(item.publishedAt) > new Date() : false);
        }
        return publicItem;
      });

      return res.status(200).json({
        success: true,
        data: sanitized,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/products/new-arrivals
   * Public storefront new arrivals (recently published, customer-visible products)
   */
  async getNewArrivals(req, res, next) {
    try {
      const { limit = 8 } = req.query;
      const products = await productService.getNewArrivals(limit);
      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/products/:slug
   * Public storefront single product by slug
   */
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const includeDrafts = Boolean(req.storefrontPreview?.canPreviewDrafts);
      const product = await productService.getProductBySlug(slug, { includeDrafts });

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/products/categories/list
   * Public category list
   */
  async getCategories(req, res, next) {
    try {
      const categories = await categoryRepository.findAll({ activeOnly: true });
      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();


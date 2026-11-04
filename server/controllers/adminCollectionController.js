const collectionService = require("../services/collectionService");

class AdminCollectionController {
  /**
   * GET /api/admin/collections
   */
  async list(req, res, next) {
    try {
      const {
        search = "",
        status = "all",
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const result = await collectionService.getCollections({
        search,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      return res.status(200).json({
        success: true,
        data: result.collections,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/collections/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const collection = await collectionService.getCollectionById(id);

      return res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/collections
   */
  async create(req, res, next) {
    try {
      const collectionData = req.body || {};
      const file = req.file || null;

      const newCollection = await collectionService.createCollection(
        collectionData,
        file,
        req.user,
        req.auditRequest
      );

      return res.status(201).json({
        success: true,
        message: "Collection created successfully.",
        data: newCollection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/collections/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const collectionData = req.body || {};
      const file = req.file || null;

      const updatedCollection = await collectionService.updateCollection(
        id,
        collectionData,
        file,
        req.user,
        req.auditRequest
      );

      return res.status(200).json({
        success: true,
        message: "Collection updated successfully.",
        data: updatedCollection,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/collections/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await collectionService.deleteCollection(id, req.user, req.auditRequest);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminCollectionController();


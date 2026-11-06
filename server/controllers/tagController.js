const tagService = require("../services/tagService");

const tagController = {
  /**
   * Create a new tag
   */
  async createTag(req, res, next) {
    try {
      const { name, slug, description } = req.body || {};
      const data = await tagService.createTag({ name, slug, description });
      res.status(201).json({
        success: true,
        message: "Tag created successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List paginated tags
   */
  async listTags(req, res, next) {
    try {
      const { search, page, limit, sortBy, sortOrder } = req.query;
      const data = await tagService.listTags({
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single tag
   */
  async getTag(req, res, next) {
    try {
      const data = await tagService.getTagById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update tag
   */
  async updateTag(req, res, next) {
    try {
      const { name, slug, description } = req.body || {};
      const data = await tagService.updateTag(req.params.id, {
        name,
        slug,
        description,
      });
      res.status(200).json({
        success: true,
        message: "Tag updated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete tag
   */
  async deleteTag(req, res, next) {
    try {
      const result = await tagService.deleteTag(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = tagController;


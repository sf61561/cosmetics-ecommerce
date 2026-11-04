const heroSliderService = require("../services/heroSliderService");

class HeroSliderController {
  async listPublic(req, res, next) {
    try {
      const placement = req.query.placement || "home_hero";
      const data = await heroSliderService.getPublic({ placement });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await heroSliderService.list(req.query);
      res.json({ success: true, data: result.slides, summary: result.summary });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await heroSliderService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async save(req, res, next) {
    try {
      const data = await heroSliderService.save(
        req.body,
        req.files,
        req.params.id || null,
        req.user,
        req.auditRequest
      );
      res.status(req.params.id ? 200 : 201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async status(req, res, next) {
    try {
      let isActive = req.body.isActive !== undefined ? req.body.isActive : req.body.is_active;
      if (isActive === undefined) {
        // Toggle current state if not explicitly specified
        const current = await heroSliderService.getById(req.params.id);
        isActive = !current.isActive;
      }
      const data = await heroSliderService.updateStatus(
        req.params.id,
        Boolean(isActive),
        req.user,
        req.auditRequest
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reorder(req, res, next) {
    try {
      const items = req.body.order || req.body.items || req.body;
      const result = await heroSliderService.reorder(items, req.user, req.auditRequest);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async duplicate(req, res, next) {
    try {
      const data = await heroSliderService.duplicate(req.params.id, req.user, req.auditRequest);
      res.status(201).json({ success: true, message: "Slide duplicated successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const data = await heroSliderService.remove(req.params.id, req.user, req.auditRequest);
      res.json({ success: true, message: "Slide deleted successfully", data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HeroSliderController();

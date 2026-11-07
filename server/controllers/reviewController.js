const reviewService = require("../services/reviewService");

class ReviewController {
  /**
   * Check eligibility to review a product
   * GET /api/reviews/eligibility?productId=...
   */
  async checkEligibility(req, res, next) {
    try {
      const { productId } = req.query;
      const result = await reviewService.checkEligibility(req.user.id, productId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submit new review
   * POST /api/reviews
   */
  async submitReview(req, res, next) {
    try {
      const files = req.files || [];
      const result = await reviewService.submitReview(
        req.user.id,
        {
          productId: req.body.productId,
          orderItemId: req.body.orderItemId,
          rating: req.body.rating,
          comment: req.body.comment,
        },
        files
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Resubmit rejected review
   * PUT /api/reviews/:id
   */
  async resubmitReview(req, res, next) {
    try {
      const files = req.files || [];
      const result = await reviewService.resubmitReview(
        req.user.id,
        req.params.id,
        {
          rating: req.body.rating,
          comment: req.body.comment,
        },
        files
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get customer's submitted reviews
   * GET /api/reviews/my-reviews
   */
  async getMyReviews(req, res, next) {
    try {
      const result = await reviewService.getMyReviews(req.user.id, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Batch get review status for items in an order
   * POST /api/reviews/order-items-status
   */
  async getOrderItemsReviewStatus(req, res, next) {
    try {
      const { orderItemIds } = req.body;
      const result = await reviewService.getOrderItemsReviewStatus(req.user.id, orderItemIds || []);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Product Details Reviews
   * GET /api/products/:id/reviews
   */
  async getPublicProductReviews(req, res, next) {
    try {
      const productId = req.params.id;
      const withPhotosOnly = req.query.withPhotosOnly === "true" || req.query.withPhotosOnly === true;
      const result = await reviewService.getPublicProductReviews(productId, {
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
        rating: req.query.rating,
        withPhotosOnly,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List reviews
   * GET /api/admin/reviews
   */
  async getAdminReviews(req, res, next) {
    try {
      const result = await reviewService.getAdminReviews(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Single review details
   * GET /api/admin/reviews/:id
   */
  async getAdminReviewById(req, res, next) {
    try {
      const result = await reviewService.getAdminReviewById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Metrics (KPIs)
   * GET /api/admin/reviews/metrics
   */
  async getAdminMetrics(req, res, next) {
    try {
      const result = await reviewService.getAdminMetrics();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Pending review count badge
   * GET /api/admin/reviews/pending-count
   */
  async getPendingCount(req, res, next) {
    try {
      const pendingCount = await reviewService.getPendingCount();
      res.status(200).json({
        success: true,
        data: { pendingCount },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Approve review
   * POST /api/admin/reviews/:id/approve
   */
  async approveReview(req, res, next) {
    try {
      const result = await reviewService.approveReview(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reject review
   * POST /api/admin/reviews/:id/reject
   */
  async rejectReview(req, res, next) {
    try {
      const result = await reviewService.rejectReview(req.params.id, req.body.reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Delete review
   * DELETE /api/admin/reviews/:id
   */
  async deleteReview(req, res, next) {
    try {
      const result = await reviewService.deleteReview(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Bulk approve reviews
   * POST /api/admin/reviews/bulk-approve
   */
  async bulkApprove(req, res, next) {
    try {
      const result = await reviewService.bulkApprove(req.body.reviewIds);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReviewController();


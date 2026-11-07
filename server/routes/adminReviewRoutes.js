const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// Protected under /api/admin/reviews (authenticated + ADMIN role via adminRoutes)

// GET /api/admin/reviews/metrics
router.get("/metrics", (req, res, next) => reviewController.getAdminMetrics(req, res, next));

// GET /api/admin/reviews/pending-count
router.get("/pending-count", (req, res, next) => reviewController.getPendingCount(req, res, next));

// POST /api/admin/reviews/bulk-approve
router.post("/bulk-approve", (req, res, next) => reviewController.bulkApprove(req, res, next));

// GET /api/admin/reviews
router.get("/", (req, res, next) => reviewController.getAdminReviews(req, res, next));

// GET /api/admin/reviews/:id
router.get("/:id", (req, res, next) => reviewController.getAdminReviewById(req, res, next));

// POST /api/admin/reviews/:id/approve
router.post("/:id/approve", (req, res, next) => reviewController.approveReview(req, res, next));

// POST /api/admin/reviews/:id/reject
router.post("/:id/reject", (req, res, next) => reviewController.rejectReview(req, res, next));

// DELETE /api/admin/reviews/:id
router.delete("/:id", (req, res, next) => reviewController.deleteReview(req, res, next));

module.exports = router;


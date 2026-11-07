const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const reviewUpload = require("../middlewares/reviewUpload");
const { authenticate } = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");

// Rate limiter for review submissions: max 10 submissions per 15 minutes per IP
const reviewSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many review submissions from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware for review uploads with graceful error handling
const handleReviewUpload = (req, res, next) => {
  reviewUpload.array("images", 5)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "One or more images exceed the 3 MB size limit.",
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "You can upload a maximum of 5 images per review.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to process uploaded images.",
      });
    }
    next();
  });
};

// Customer routes (Protected)
router.use(authenticate);

// GET /api/reviews/eligibility?productId=...
router.get("/eligibility", (req, res, next) => reviewController.checkEligibility(req, res, next));

// POST /api/reviews/order-items-status
router.post("/order-items-status", (req, res, next) => reviewController.getOrderItemsReviewStatus(req, res, next));

// GET /api/reviews/my-reviews
router.get("/my-reviews", (req, res, next) => reviewController.getMyReviews(req, res, next));

// POST /api/reviews (Submit new review)
router.post("/", reviewSubmitLimiter, handleReviewUpload, (req, res, next) => reviewController.submitReview(req, res, next));

// PUT /api/reviews/:id (Resubmit rejected review)
router.put("/:id", reviewSubmitLimiter, handleReviewUpload, (req, res, next) => reviewController.resubmitReview(req, res, next));

module.exports = router;

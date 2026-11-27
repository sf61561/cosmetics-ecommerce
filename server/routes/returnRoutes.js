const express = require("express");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const controller = require("../controllers/returnController");

const router = express.Router();

// All customer return endpoints require CUSTOMER login
router.use(authenticate, requireRole("CUSTOMER"));

// Upload photo evidence (Cloudinary memory streaming)
router.post(
  "/upload-evidence",
  upload.single("image"),
  (req, res, next) => controller.uploadEvidence(req, res, next)
);

// Check order return eligibility & get returnable items
router.get(
  "/order/:orderId/eligibility",
  (req, res, next) => controller.getOrderEligibility(req, res, next)
);

// Return CRUD
router.post("/", (req, res, next) => controller.createReturn(req, res, next));
router.get("/", (req, res, next) => controller.list(req, res, next));
router.get("/:id", (req, res, next) => controller.getById(req, res, next));
router.patch("/:id/photos", (req, res, next) => controller.addPhotos(req, res, next));

module.exports = router;

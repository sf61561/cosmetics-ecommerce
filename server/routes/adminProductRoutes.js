const express = require("express");
const router = express.Router();
const adminProductController = require("../controllers/adminProductController");
const upload = require("../middlewares/upload");

// Middleware to handle multer upload errors cleanly
const handleMultiUpload = (req, res, next) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "One or more images exceed the 5 MB file size limit.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "A maximum of 10 images can be uploaded at once.",
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

// ─── Categories Helper ───
router.get("/categories/all", (req, res, next) => adminProductController.getCategories(req, res, next));

// ─── Standalone Multi-Image Upload ───
router.post("/upload-images", handleMultiUpload, (req, res, next) =>
  adminProductController.uploadImages(req, res, next)
);

// ─── Product CRUD ───
router.get("/", (req, res, next) => adminProductController.list(req, res, next));
router.get("/:id", (req, res, next) => adminProductController.getById(req, res, next));
router.post("/", handleMultiUpload, (req, res, next) => adminProductController.create(req, res, next));
router.patch("/:id", handleMultiUpload, (req, res, next) => adminProductController.update(req, res, next));
router.patch("/:id/status", (req, res, next) => adminProductController.updateStatus(req, res, next));
router.delete("/:id", (req, res, next) => adminProductController.delete(req, res, next));

module.exports = router;


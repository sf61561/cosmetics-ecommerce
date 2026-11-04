const express = require("express");
const router = express.Router();
const adminBrandController = require("../controllers/adminBrandController");
const upload = require("../middlewares/upload");

// Multer upload wrapper with friendly error handling (supports either 'logo' or 'image' field)
const handleLogoUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    upload.fields([
      { name: "logo", maxCount: 1 },
      { name: "image", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Brand logo exceeds the 5 MB limit. Please upload a smaller image file.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to process logo file upload.",
        });
      }

      // Normalize file to req.file
      if (req.files) {
        if (req.files.logo && req.files.logo[0]) {
          req.file = req.files.logo[0];
        } else if (req.files.image && req.files.image[0]) {
          req.file = req.files.image[0];
        }
      }
      next();
    });
  } else {
    next();
  }
};

// GET /api/admin/brands - List brands with search, filters, sorting, and pagination
router.get("/", (req, res, next) => adminBrandController.list(req, res, next));

// GET /api/admin/brands/:id - Get single brand
router.get("/:id", (req, res, next) => adminBrandController.getById(req, res, next));

// POST /api/admin/brands - Create brand (supports multipart logo upload or JSON)
router.post("/", handleLogoUpload, (req, res, next) =>
  adminBrandController.create(req, res, next)
);

// PATCH /api/admin/brands/:id - Update brand
router.patch("/:id", handleLogoUpload, (req, res, next) =>
  adminBrandController.update(req, res, next)
);

// DELETE /api/admin/brands/:id - Delete brand
router.delete("/:id", (req, res, next) => adminBrandController.delete(req, res, next));

module.exports = router;


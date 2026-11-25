const express = require("express");
const router = express.Router();
const adminBrandController = require("../controllers/adminBrandController");
const upload = require("../middlewares/upload");
const { requirePermission } = require("../middlewares/permissionMiddleware");

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

// GET /api/admin/brands
router.get("/", requirePermission("products.view"), (req, res, next) =>
  adminBrandController.list(req, res, next)
);

// GET /api/admin/brands/:id
router.get("/:id", requirePermission("products.view"), (req, res, next) =>
  adminBrandController.getById(req, res, next)
);

// POST /api/admin/brands
router.post(
  "/",
  requirePermission("products.create"),
  handleLogoUpload,
  (req, res, next) => adminBrandController.create(req, res, next)
);

// PATCH /api/admin/brands/:id
router.patch(
  "/:id",
  requirePermission("products.edit"),
  handleLogoUpload,
  (req, res, next) => adminBrandController.update(req, res, next)
);

// DELETE /api/admin/brands/:id
router.delete("/:id", requirePermission("products.delete"), (req, res, next) =>
  adminBrandController.delete(req, res, next)
);

module.exports = router;

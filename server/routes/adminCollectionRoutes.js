const express = require("express");
const router = express.Router();
const adminCollectionController = require("../controllers/adminCollectionController");
const upload = require("../middlewares/upload");
const { requirePermission } = require("../middlewares/permissionMiddleware");

// Multer upload wrapper with friendly error handling
const handleImageUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    upload.single("image")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Collection image exceeds the 5 MB limit. Please upload a smaller image.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to process image file upload.",
        });
      }
      next();
    });
  } else {
    next();
  }
};

// GET /api/admin/collections
router.get("/", requirePermission("products.view"), (req, res, next) =>
  adminCollectionController.list(req, res, next)
);

// GET /api/admin/collections/:id
router.get("/:id", requirePermission("products.view"), (req, res, next) =>
  adminCollectionController.getById(req, res, next)
);

// POST /api/admin/collections
router.post(
  "/",
  requirePermission("products.create"),
  handleImageUpload,
  (req, res, next) => adminCollectionController.create(req, res, next)
);

// PATCH /api/admin/collections/:id
router.patch(
  "/:id",
  requirePermission("products.edit"),
  handleImageUpload,
  (req, res, next) => adminCollectionController.update(req, res, next)
);

// DELETE /api/admin/collections/:id
router.delete("/:id", requirePermission("products.delete"), (req, res, next) =>
  adminCollectionController.delete(req, res, next)
);

module.exports = router;

const express = require("express");
const heroSliderController = require("../controllers/heroSliderController");
const upload = require("../middlewares/upload");
const { requirePermission } = require("../middlewares/permissionMiddleware");

const router = express.Router();
const handleUploads = upload.fields([
  { name: "desktopImage", maxCount: 1 },
  { name: "mobileImage", maxCount: 1 },
]);

// Sliders view vs edit
router.get("/", requirePermission("settings.store_view"), (req, res, next) =>
  heroSliderController.list(req, res, next)
);
router.get("/:id", requirePermission("settings.store_view"), (req, res, next) =>
  heroSliderController.getById(req, res, next)
);

router.post("/", requirePermission("settings.store_edit"), handleUploads, (req, res, next) =>
  heroSliderController.save(req, res, next)
);
router.patch("/reorder", requirePermission("settings.store_edit"), (req, res, next) =>
  heroSliderController.reorder(req, res, next)
);
router.patch("/:id", requirePermission("settings.store_edit"), handleUploads, (req, res, next) =>
  heroSliderController.save(req, res, next)
);
router.put("/:id", requirePermission("settings.store_edit"), handleUploads, (req, res, next) =>
  heroSliderController.save(req, res, next)
);
router.patch("/:id/status", requirePermission("settings.store_edit"), (req, res, next) =>
  heroSliderController.status(req, res, next)
);
router.patch("/:id/toggle", requirePermission("settings.store_edit"), (req, res, next) =>
  heroSliderController.status(req, res, next)
);
router.post("/:id/duplicate", requirePermission("settings.store_edit"), (req, res, next) =>
  heroSliderController.duplicate(req, res, next)
);
router.delete("/:id", requirePermission("settings.store_edit"), (req, res, next) =>
  heroSliderController.remove(req, res, next)
);

module.exports = router;

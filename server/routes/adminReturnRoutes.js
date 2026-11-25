const express = require("express");
const upload = require("../middlewares/upload");
const controller = require("../controllers/adminReturnController");
const { requirePermission } = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/", requirePermission("returns.view"), (req, res, next) => controller.list(req, res, next));
router.get("/:id", requirePermission("returns.view"), (req, res, next) => controller.getById(req, res, next));

router.patch("/:id/status", requirePermission("returns.approve_reject"), (req, res, next) =>
  controller.updateStatus(req, res, next)
);
router.post("/:id/request-photos", requirePermission("returns.approve_reject"), (req, res, next) =>
  controller.requestPhotos(req, res, next)
);

router.patch("/:id/inspection", requirePermission("returns.inspect"), (req, res, next) =>
  controller.saveInspection(req, res, next)
);
router.post(
  "/:id/inspection-photo",
  requirePermission("returns.inspect"),
  upload.single("image"),
  (req, res, next) => controller.uploadInspectionPhoto(req, res, next)
);
router.post(
  "/upload-inspection-photo",
  requirePermission("returns.inspect"),
  upload.single("image"),
  (req, res, next) => controller.uploadInspectionPhoto(req, res, next)
);

router.post("/:id/process-refund", requirePermission("returns.refund"), (req, res, next) =>
  controller.processRefund(req, res, next)
);

module.exports = router;

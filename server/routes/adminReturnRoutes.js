const express = require("express");
const upload = require("../middlewares/upload");
const controller = require("../controllers/adminReturnController");

const router = express.Router();

router.get("/", (req, res, next) => controller.list(req, res, next));
router.post(
  "/upload-inspection-photo",
  upload.single("image"),
  (req, res, next) => controller.uploadInspectionPhoto(req, res, next)
);
router.get("/:id", (req, res, next) => controller.getById(req, res, next));
router.patch("/:id/status", (req, res, next) => controller.updateStatus(req, res, next));
router.post("/:id/request-photos", (req, res, next) => controller.requestPhotos(req, res, next));
router.patch("/:id/inspection", (req, res, next) => controller.saveInspection(req, res, next));
router.post(
  "/:id/inspection-photo",
  upload.single("image"),
  (req, res, next) => controller.uploadInspectionPhoto(req, res, next)
);
router.post("/:id/process-refund", (req, res, next) => controller.processRefund(req, res, next));

module.exports = router;

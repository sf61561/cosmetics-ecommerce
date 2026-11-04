const express = require("express");
const heroSliderController = require("../controllers/heroSliderController");
const upload = require("../middlewares/upload");

const router = express.Router();
const handleUploads = upload.fields([
  { name: "desktopImage", maxCount: 1 },
  { name: "mobileImage", maxCount: 1 },
]);

router.get("/", (req, res, next) => heroSliderController.list(req, res, next));
router.get("/:id", (req, res, next) => heroSliderController.getById(req, res, next));
router.post("/", handleUploads, (req, res, next) => heroSliderController.save(req, res, next));
router.patch("/reorder", (req, res, next) => heroSliderController.reorder(req, res, next));
router.patch("/:id", handleUploads, (req, res, next) => heroSliderController.save(req, res, next));
router.put("/:id", handleUploads, (req, res, next) => heroSliderController.save(req, res, next));
router.patch("/:id/status", (req, res, next) => heroSliderController.status(req, res, next));
router.patch("/:id/toggle", (req, res, next) => heroSliderController.status(req, res, next));
router.post("/:id/duplicate", (req, res, next) => heroSliderController.duplicate(req, res, next));
router.delete("/:id", (req, res, next) => heroSliderController.remove(req, res, next));

module.exports = router;

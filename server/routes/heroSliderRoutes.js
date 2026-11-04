const express = require("express");
const heroSliderController = require("../controllers/heroSliderController");
const upload = require("../middlewares/upload");

const router = express.Router();

router.get("/", (req, res, next) => heroSliderController.listPublic(req, res, next));

module.exports = router;

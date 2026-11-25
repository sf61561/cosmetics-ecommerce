const express = require("express");
const controller = require("../controllers/adminAuditController");
const { requireRole } = require("../middlewares/authMiddleware");
const router = express.Router();

// Strictly restrict audit logs to Super Admin
router.use(requireRole("SUPERADMIN"));

router.get("/", controller.list);
router.get("/:id", controller.getById);

module.exports = router;

const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const superadminController = require("../controllers/superadminController");

// Strictly protect all Super Admin governance endpoints
router.use(authenticate, requireRole("SUPERADMIN"));

// Administrator Account Management
router.get("/admins", superadminController.listAdmins);
router.post("/admins/invite", superadminController.inviteAdmin);
router.post("/admins/:id/resend-invite", superadminController.resendInvite);
router.delete("/admins/:id/cancel-invite", superadminController.cancelInvite);
router.put("/admins/:id/permissions", superadminController.updateAdminPermissions);
router.patch("/admins/:id/status", superadminController.updateAdminStatus);
router.post("/admins/:id/force-logout", superadminController.forceLogoutAdmin);
router.post("/admins/:id/reset-password", superadminController.triggerAdminPasswordReset);

// Master Permissions
router.get("/permissions", superadminController.listPermissions);

// Custom Presets
router.get("/presets", superadminController.listPresets);
router.post("/presets", superadminController.createPreset);
router.put("/presets/:id", superadminController.updatePreset);
router.delete("/presets/:id", superadminController.deletePreset);

module.exports = router;

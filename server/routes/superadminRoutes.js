const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const superadminController = require("../controllers/superadminController");
const adminAuditRoutes = require("./adminAuditRoutes");
const adminProfileController = require("../controllers/adminProfileController");

// Strictly protect all Super Admin governance endpoints
router.use(authenticate, requireRole("SUPERADMIN"));

// Governance Dashboard APIs
router.get("/dashboard", superadminController.getDashboardSummary);
router.get("/dashboard/charts", superadminController.getDashboardCharts);
router.get("/dashboard/activity", superadminController.getDashboardActivity);
router.get("/dashboard/overview", superadminController.getDashboardOverview);

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

// Custom Presets (mounted under both /presets and /permissions/presets)
router.get("/presets", superadminController.listPresets);
router.post("/presets", superadminController.createPreset);
router.put("/presets/:id", superadminController.updatePreset);
router.delete("/presets/:id", superadminController.deletePreset);

router.get("/permissions/presets", superadminController.listPresets);
router.post("/permissions/presets", superadminController.createPreset);
router.put("/permissions/presets/:id", superadminController.updatePreset);
router.delete("/permissions/presets/:id", superadminController.deletePreset);

// Audit Logs (strictly Super Admin)
router.use("/audit-logs", adminAuditRoutes);

// Super Admin Profile Password Management with Email OTP
router.post("/profile/password/request-code", (req, res, next) =>
  adminProfileController.requestPasswordChangeCode(req, res, next)
);
router.post("/profile/password/confirm", (req, res, next) =>
  adminProfileController.confirmPasswordChange(req, res, next)
);

module.exports = router;

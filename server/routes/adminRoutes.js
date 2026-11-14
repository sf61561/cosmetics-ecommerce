const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const { query } = require("../config/db");
const adminCollectionRoutes = require("./adminCollectionRoutes");
const adminBrandRoutes = require("./adminBrandRoutes");
const adminProductRoutes = require("./adminProductRoutes");
const adminCustomerRoutes = require("./adminCustomerRoutes");
const adminPromotionRoutes = require("./adminPromotionRoutes");
const adminHeroSliderRoutes = require("./adminHeroSliderRoutes");
const dashboardService = require("../services/dashboardService");
const adminOrderRoutes = require("./adminOrderRoutes");
const adminAuditRoutes = require("./adminAuditRoutes");
const { adminNotificationRouter } = require("./notificationRoutes");
const adminProductRequestRoutes = require("./adminProductRequestRoutes");
const adminTagRoutes = require("./adminTagRoutes");
const adminReviewRoutes = require("./adminReviewRoutes");
const adminReturnRoutes = require("./adminReturnRoutes");

// Protect ALL routes under /api/admin with authentication + ADMIN role requirement
router.use(authenticate, requireRole("ADMIN"));

// Returns Management API
router.use("/returns", adminReturnRoutes);

// Reviews Management API
router.use("/reviews", adminReviewRoutes);

// Tags Management API
router.use("/tags", adminTagRoutes);

// Product Requests Management API
router.use("/product-requests", adminProductRequestRoutes);

// Customers Management API
router.use("/customers", adminCustomerRoutes);

// Products Management API
router.use("/products", adminProductRoutes);

// Collections Management API
router.use("/collections", adminCollectionRoutes);

// Brands Management API
router.use("/brands", adminBrandRoutes);
router.use("/hero-sliders", adminHeroSliderRoutes);
router.use("/sliders", adminHeroSliderRoutes);
router.use("/orders", adminOrderRoutes);
router.use("/audit-logs", adminAuditRoutes);
router.use("/notifications", adminNotificationRouter);
router.use("/", adminPromotionRoutes);

/**
 * GET /api/admin/check
 * Verify admin status
 */
router.get("/check", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access verified.",
    user: req.user,
  });
});

router.get("/dashboard/overview", async (req, res, next) => {
  try {
    res.json({ success: true, data: await dashboardService.getOverview(req.query.range) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/dashboard
 * Overview statistics (accessible strictly to ADMIN)
 */
router.get("/dashboard", async (req, res, next) => {
  try {
    const usersCountRes = await query("SELECT COUNT(*) AS total_users FROM users");
    const customersCountRes = await query("SELECT COUNT(*) AS total_customers FROM users WHERE role = 'CUSTOMER'");
    const adminsCountRes = await query("SELECT COUNT(*) AS total_admins FROM users WHERE role = 'ADMIN'");
    const activeProductsRes = await query("SELECT COUNT(*) AS active_products FROM products WHERE status = 'ACTIVE'");

    res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(usersCountRes.rows[0].total_users, 10),
        totalCustomers: parseInt(customersCountRes.rows[0].total_customers, 10),
        totalAdmins: parseInt(adminsCountRes.rows[0].total_admins, 10),
        totalOrders: 128,
        activeProducts: parseInt(activeProductsRes.rows[0].active_products, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users
 * List all users with roles (accessible strictly to ADMIN)
 */
router.get("/users", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, name, email, phone, role, email_verified_at, authprovider, created_at FROM users ORDER BY created_at DESC"
    );

    res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

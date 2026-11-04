const express = require("express");
const router = express.Router();
const adminCustomerController = require("../controllers/adminCustomerController");

// Export CSV (must be placed before /:id to avoid route shadowing)
router.get("/export", (req, res, next) =>
  adminCustomerController.exportCsv(req, res, next)
);

// List customers with search, filters, pagination, and KPI counts
router.get("/", (req, res, next) =>
  adminCustomerController.list(req, res, next)
);

// Get single customer details
router.get("/:id", (req, res, next) =>
  adminCustomerController.getById(req, res, next)
);

// Update permitted customer profile fields (name, phone)
router.patch("/:id", (req, res, next) =>
  adminCustomerController.updateProfile(req, res, next)
);

// Block or unblock customer account status
router.patch("/:id/status", (req, res, next) =>
  adminCustomerController.updateStatus(req, res, next)
);

// Get customer orders
router.get("/:id/orders", (req, res, next) =>
  adminCustomerController.getOrders(req, res, next)
);

// Get customer wishlist items
router.get("/:id/wishlist", (req, res, next) =>
  adminCustomerController.getWishlist(req, res, next)
);

// Get customer activity log
router.get("/:id/activity", (req, res, next) =>
  adminCustomerController.getActivity(req, res, next)
);

// Get customer saved delivery addresses
router.get("/:id/addresses", (req, res, next) =>
  adminCustomerController.getAddresses(req, res, next)
);

module.exports = router;


const superadminService = require("../services/superadminService");
const auditService = require("../services/auditService");

/**
 * Middleware factory to enforce specific operational permissions for Admins.
 * Super Admins automatically bypass all permission checks.
 *
 * @param {string|string[]} required - Single permission key or array of keys
 * @param {object} [options] - Configuration options { mode: "all" | "any" }
 */
function requirePermission(required, options = { mode: "all" }) {
  const requiredKeys = Array.isArray(required) ? required : [required];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // Super Admin inherits all operational permissions unconditionally
      if (user.role === "SUPERADMIN") {
        req.userPermissions = ["*"];
        return next();
      }

      // Non-admin roles cannot access admin permissioned endpoints
      if (user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Administrator access required.",
        });
      }

      // Fetch user's active permissions (30s TTL cached in memory)
      const userPermissions = await superadminService.getUserPermissions(user.id);
      req.userPermissions = userPermissions;

      const hasAccess =
        options.mode === "any"
          ? requiredKeys.some((key) => userPermissions.includes(key))
          : requiredKeys.every((key) => userPermissions.includes(key));

      if (!hasAccess) {
        // Record audit event for security monitoring (best effort)
        auditService.recordBestEffort(
          {
            actor: user,
            action: "ACCESS_DENIED",
            entityType: "SYSTEM",
            metadata: {
              attemptedEndpoint: req.originalUrl,
              method: req.method,
              requiredPermissions: requiredKeys,
              userPermissionsCount: userPermissions.length,
            },
          },
          { request: req.auditRequest }
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${requiredKeys.join(", ")}`,
          requiredPermissions: requiredKeys,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Helper to test if a user has a specific permission
 */
async function userHasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === "SUPERADMIN") return true;
  if (user.role !== "ADMIN") return false;
  const perms = await superadminService.getUserPermissions(user.id);
  return perms.includes(permissionKey);
}

module.exports = {
  requirePermission,
  userHasPermission,
};

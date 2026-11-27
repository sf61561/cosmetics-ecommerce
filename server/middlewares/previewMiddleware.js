const superadminService = require("../services/superadminService");
const userRepository = require("../repositories/userRepository");

function isPreviewRequested(req) {
  const q = String(req.query?.preview || "").toLowerCase();
  const h = String(req.headers["x-storefront-preview"] || "").toLowerCase();
  return q === "1" || q === "true" || h === "1" || h === "true";
}

async function resolveStorefrontPreviewPermissions(user) {
  if (!user || !user.id) {
    return { authorized: false, canPreviewDrafts: false, role: null };
  }

  // Always check live database user role & status so disabled/demoted admins lose access immediately
  const liveUser = await userRepository.findById(user.id);
  if (!liveUser || liveUser.status !== "ACTIVE") {
    return { authorized: false, canPreviewDrafts: false, role: null };
  }

  if (liveUser.role === "SUPERADMIN") {
    return { authorized: true, canPreviewDrafts: true, role: "SUPERADMIN" };
  }

  if (liveUser.role !== "ADMIN") {
    return { authorized: false, canPreviewDrafts: false, role: liveUser.role };
  }

  const permissions = await superadminService.getUserPermissions(liveUser.id);
  const hasView = permissions.includes("storefront.view");
  const hasDrafts = hasView && permissions.includes("storefront.preview_drafts");
  return {
    authorized: hasView,
    canPreviewDrafts: hasDrafts,
    role: "ADMIN",
  };
}

/**
 * Attaches `req.storefrontPreview` without blocking public access.
 * Draft items remain strictly forbidden unless preview is requested AND
 * the authenticated user holds verified admin preview permissions.
 */
async function attachPreviewContext(req, res, next) {
  try {
    const requested = isPreviewRequested(req);
    if (!requested || !req.user) {
      req.storefrontPreview = {
        requested,
        authorized: false,
        canPreviewDrafts: false,
      };
      return next();
    }

    const perms = await resolveStorefrontPreviewPermissions(req.user);
    req.storefrontPreview = {
      requested: true,
      authorized: perms.authorized,
      canPreviewDrafts: perms.canPreviewDrafts,
    };

    if (perms.authorized) {
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  isPreviewRequested,
  resolveStorefrontPreviewPermissions,
  attachPreviewContext,
};

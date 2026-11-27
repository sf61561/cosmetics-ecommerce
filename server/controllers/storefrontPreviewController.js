const { query } = require("../config/db");
const { resolveStorefrontPreviewPermissions } = require("../middlewares/previewMiddleware");

class StorefrontPreviewController {
  /**
   * GET /api/storefront-preview/session
   * Public-safe session verification check for storefront iframe.
   * Always reads live permissions and ignores preview flags for non-permitted users.
   */
  async getSession(req, res, next) {
    try {
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      });

      const perms = await resolveStorefrontPreviewPermissions(req.user);
      return res.status(200).json({
        success: true,
        data: {
          authorized: perms.authorized,
          canPreviewDrafts: perms.canPreviewDrafts,
          role: perms.authorized ? perms.role : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/storefront-preview/context
   * Protected admin endpoint providing searchable page selector lists
   * (collections, brands, products) without exposing supplier cost or profit fields.
   */
  async getAdminContext(req, res, next) {
    try {
      const perms = await resolveStorefrontPreviewPermissions(req.user);
      const canPreviewDrafts = perms.canPreviewDrafts;

      const [collectionsRes, brandsRes, productsRes] = await Promise.all([
        query(
          `SELECT id, name, slug, is_active
           FROM collections
           ${canPreviewDrafts ? "" : "WHERE is_active = true"}
           ORDER BY name ASC`
        ),
        query(
          `SELECT id, name, slug, is_active
           FROM brands
           ${canPreviewDrafts ? "" : "WHERE is_active = true"}
           ORDER BY name ASC`
        ),
        query(
          `SELECT id, name, slug, status, published_at
           FROM products
           ${canPreviewDrafts ? "" : "WHERE status = 'ACTIVE' AND (published_at IS NULL OR published_at <= NOW())"}
           ORDER BY updated_at DESC, name ASC
           LIMIT 300`
        ),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          authorized: true,
          canPreviewDrafts,
          collections: collectionsRes.rows.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            isActive: Boolean(c.is_active),
            isDraft: !c.is_active,
          })),
          brands: brandsRes.rows.map((b) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
            isActive: Boolean(b.is_active),
            isDraft: !b.is_active,
          })),
          products: productsRes.rows.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,
            isDraft:
              p.status !== "ACTIVE" ||
              (p.published_at ? new Date(p.published_at) > new Date() : false),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StorefrontPreviewController();

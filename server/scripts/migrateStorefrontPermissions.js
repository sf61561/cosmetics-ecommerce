require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { pool } = require("../config/db");

const STOREFRONT_PERMISSIONS = [
  {
    key: "storefront.view",
    label: "View storefront preview",
    group: "Storefront",
    description: "See the Storefront Preview page and preview published storefront pages inside admin",
  },
  {
    key: "storefront.preview_drafts",
    label: "Preview draft items",
    group: "Storefront",
    description: "Preview unpublished, hidden, and draft products, collections, and brands (requires storefront.view)",
  },
];

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const perm of STOREFRONT_PERMISSIONS) {
      await client.query(
        `INSERT INTO permissions (key, label, "group", description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE
         SET label = EXCLUDED.label, "group" = EXCLUDED."group", description = EXCLUDED.description`,
        [perm.key, perm.label, perm.group, perm.description]
      );
    }

    // Ensure any preset named "Product Manager" or "Order Manager" includes matching Storefront keys if present
    const pmPreset = await client.query(`SELECT id FROM permission_presets WHERE LOWER(name) = 'product manager' LIMIT 1`);
    if (pmPreset.rows[0]) {
      await client.query(
        `INSERT INTO preset_permissions (preset_id, permission_id)
         SELECT $1, id FROM permissions WHERE key IN ('storefront.view', 'storefront.preview_drafts')
         ON CONFLICT (preset_id, permission_id) DO NOTHING`,
        [pmPreset.rows[0].id]
      );
    }

    const omPreset = await client.query(`SELECT id FROM permission_presets WHERE LOWER(name) = 'order manager' LIMIT 1`);
    if (omPreset.rows[0]) {
      await client.query(
        `INSERT INTO preset_permissions (preset_id, permission_id)
         SELECT $1, id FROM permissions WHERE key = 'storefront.view'
         ON CONFLICT (preset_id, permission_id) DO NOTHING`,
        [omPreset.rows[0].id]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Storefront permissions seeded (default OFF for existing admins).");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Storefront permission migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

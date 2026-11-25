require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { pool } = require("../config/db");

const operationalPermissions = [
  // Catalog
  { key: "products.view", label: "View Products & Taxonomies", group: "Catalog", description: "View products, categories, collections, brands, tags" },
  { key: "products.create", label: "Create Products", group: "Catalog", description: "Create new products, categories, collections, brands" },
  { key: "products.edit", label: "Edit Products & Stock", group: "Catalog", description: "Edit product details, update prices, adjust stock levels" },
  { key: "products.delete", label: "Delete Products", group: "Catalog", description: "Delete products and catalog taxonomies" },

  // Orders
  { key: "orders.view", label: "View Orders", group: "Orders", description: "View order directory, order timeline, customer notes" },
  { key: "orders.edit", label: "Update Order Shipping", group: "Orders", description: "Update shipping courier partner and tracking numbers" },
  { key: "orders.status", label: "Change Order Status", group: "Orders", description: "Transition order fulfillment status (Confirm, Ship, Deliver)" },
  { key: "orders.cancel", label: "Cancel Orders", group: "Orders", description: "Cancel orders and execute atomic inventory restoral" },
  { key: "orders.manual_create", label: "Create Manual Orders", group: "Orders", description: "Manually create customer orders from admin" },

  // Financials
  { key: "costs.view", label: "View Item Sourcing Costs", group: "Financials", description: "View item-level supplier sourcing costs (cost_price)" },
  { key: "costs.edit", label: "Enter/Edit Sourcing Costs", group: "Financials", description: "Enter or update item-level sourcing costs" },
  { key: "other_costs.view", label: "View Operating Costs", group: "Financials", description: "View operating expense records (order_other_costs)" },
  { key: "other_costs.add", label: "Add Operating Costs", group: "Financials", description: "Add new operating expenses to orders" },
  { key: "other_costs.edit", label: "Edit Operating Costs", group: "Financials", description: "Modify existing operating expense lines" },
  { key: "other_costs.delete", label: "Delete Operating Costs", group: "Financials", description: "Delete operating expense records" },
  { key: "profit.view", label: "View Profit Figures", group: "Financials", description: "View Gross Margin and Net Operating Profit calculations" },

  // Returns
  { key: "returns.view", label: "View Returns & Refunds", group: "Returns", description: "View return requests and customer uploaded evidence" },
  { key: "returns.approve_reject", label: "Approve or Reject Returns", group: "Returns", description: "Approve or reject return requests" },
  { key: "returns.inspect", label: "Warehouse Inspection", group: "Returns", description: "Submit warehouse physical inspection and condition grading" },
  { key: "returns.refund", label: "Process & Disburse Refund", group: "Returns", description: "Authorize and disburse refunds (MFS, Bank, Cash)" },

  // Customers
  { key: "customers.view", label: "View Customer Directory", group: "Customers", description: "Browse customer directory, order history, address books" },
  { key: "customers.edit", label: "Edit Customer Profiles", group: "Customers", description: "Update customer account details, toggle status" },

  // General
  { key: "export.allow", label: "Export Data Reports", group: "General", description: "Download CSV / Excel reports across data tables" },

  // Settings
  { key: "settings.store_view", label: "View Store Settings", group: "Settings", description: "View delivery rate settings and promotional coupons" },
  { key: "settings.store_edit", label: "Edit Store Settings", group: "Settings", description: "Update delivery rules, discounts, and promotional banners" },
];

async function runMigration() {
  const client = await pool.connect();
  console.log("⚡ Starting Super Admin & Permissions Migration...");

  try {
    await client.query("BEGIN");

    // 1. Update users table status check constraint
    console.log("1. Updating users table schema...");
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
      ALTER TABLE users ADD CONSTRAINT users_status_check 
        CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED', 'BLOCKED', 'SUSPENDED'));
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
    `);

    // 2. Create permissions table
    console.log("2. Creating permissions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(150) NOT NULL,
        "group" VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);
      CREATE INDEX IF NOT EXISTS idx_permissions_group ON permissions("group");
    `);

    // 3. Create admin_permissions table
    console.log("3. Creating admin_permissions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, permission_id)
      );
      CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);
    `);

    // 4. Create admin_invites table
    console.log("4. Creating admin_invites table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_invites_token_hash ON admin_invites(token_hash);
      CREATE INDEX IF NOT EXISTS idx_admin_invites_user_id ON admin_invites(user_id);
    `);

    // 5. Create admin_password_change_requests table
    console.log("5. Creating admin_password_change_requests table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_password_change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_pwd_change_user_id ON admin_password_change_requests(user_id);
    `);

    // 6. Create permission_presets and preset_permissions tables (starts empty)
    console.log("6. Creating dynamic permission_presets tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS permission_presets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS preset_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        preset_id UUID NOT NULL REFERENCES permission_presets(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(preset_id, permission_id)
      );
    `);

    // 7. Seed master operational permissions list
    console.log("7. Seeding operational permissions...");
    for (const perm of operationalPermissions) {
      await client.query(
        `INSERT INTO permissions (key, label, "group", description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE
         SET label = EXCLUDED.label, "group" = EXCLUDED."group", description = EXCLUDED.description`,
        [perm.key, perm.label, perm.group, perm.description]
      );
    }

    // 8. Promote existing admin(s) to SUPERADMIN
    console.log("8. Promoting existing admin to SUPERADMIN...");
    const promoteResult = await client.query(`
      UPDATE users
      SET role = 'SUPERADMIN'::user_role, updated_at = NOW()
      WHERE email = 'tausifmayeen@gmail.com' OR role::text = 'ADMIN'
      RETURNING id, name, email, role, status
    `);

    console.log(`✓ Promoted ${promoteResult.rowCount} user(s) to SUPERADMIN:`, promoteResult.rows);

    await client.query("COMMIT");
    console.log("🎉 Migration completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed! Rolled back.", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

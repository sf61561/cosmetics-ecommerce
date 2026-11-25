require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { query, pool } = require("../config/db");
const auditActions = require("../constants/auditActions");

async function updateAuditConstraints() {
  console.log("Updating audit_logs constraints in PostgreSQL...");

  // 1. Drop existing constraints if they exist
  await query(`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_allowed;`);
  await query(`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;`);
  await query(`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_type_check;`);

  // 2. Add updated actor_type check constraint
  await query(`
    ALTER TABLE audit_logs 
    ADD CONSTRAINT audit_logs_actor_type_check 
    CHECK (actor_type IN ('SUPERADMIN', 'ADMIN', 'CUSTOMER', 'SYSTEM', 'ANONYMOUS'));
  `);

  // 3. Add updated action check constraint with all auditActions
  const actionsList = auditActions.map((a) => `'${a}'`).join(", ");
  await query(`
    ALTER TABLE audit_logs 
    ADD CONSTRAINT audit_logs_action_allowed 
    CHECK (action IN (${actionsList}));
  `);

  console.log("✅ audit_logs constraints successfully updated!");
  await pool.end();
}

updateAuditConstraints().catch((err) => {
  console.error("Failed to update audit constraints:", err);
  process.exit(1);
});

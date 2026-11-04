const { query } = require("../config/db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set(require("../constants/auditActions"));
const entities = new Set(["USER", "PRODUCT", "INVENTORY", "ORDER", "COLLECTION", "BRAND", "COUPON", "DELIVERY_RULE", "HERO_SLIDER", "SYSTEM"]);
const actorTypes = new Set(["ADMIN", "CUSTOMER", "SYSTEM", "ANONYMOUS"]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validateFilters(input = {}) {
  const page = Number(input.page ?? 1);
  const limit = Number(input.limit ?? 25);
  if (!Number.isInteger(page) || page < 1 || page > 100000) badRequest("Page must be a positive integer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) badRequest("Limit must be between 1 and 100.");
  const filters = { page, limit };
  if (input.action) {
    if (!actions.has(String(input.action))) badRequest("Unsupported audit action filter.");
    filters.action = String(input.action);
  }
  if (input.entityType) {
    if (!entities.has(String(input.entityType))) badRequest("Unsupported audit entity filter.");
    filters.entityType = String(input.entityType);
  }
  if (input.actorType) {
    if (!actorTypes.has(String(input.actorType))) badRequest("Unsupported actor type filter.");
    filters.actorType = String(input.actorType);
  }
  if (input.actorId) {
    if (!UUID.test(String(input.actorId))) badRequest("Actor ID must be a UUID.");
    filters.actorId = String(input.actorId);
  }
  if (input.entityId) {
    const entityId = String(input.entityId).trim();
    if (!entityId || entityId.length > 100) badRequest("Entity ID is invalid.");
    filters.entityId = entityId;
  }
  for (const key of ["from", "to"]) {
    if (input[key]) {
      const value = String(input[key]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        badRequest(`${key === "from" ? "Start" : "End"} date must use YYYY-MM-DD.`);
      }
      filters[key] = value;
    }
  }
  if (filters.from && filters.to && filters.from > filters.to) badRequest("Start date cannot be after end date.");
  if (input.search) filters.search = String(input.search).trim().slice(0, 100);
  return filters;
}

function addCondition(conditions, values, sql, value) {
  values.push(value);
  conditions.push(sql.replace("?", `$${values.length}`));
}

function mapLog(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    previousValues: row.previous_values,
    newValues: row.new_values,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    requestId: row.request_id,
    createdAt: row.created_at,
  };
}

const auditRepository = {
  validateFilters,
  async list(input = {}) {
    const filters = validateFilters(input);
    const conditions = [];
    const values = [];
    if (filters.action) addCondition(conditions, values, "action = ?", filters.action);
    if (filters.entityType) addCondition(conditions, values, "entity_type = ?", filters.entityType);
    if (filters.entityId) addCondition(conditions, values, "entity_id = ?", filters.entityId);
    if (filters.actorType) addCondition(conditions, values, "actor_type = ?", filters.actorType);
    if (filters.actorId) addCondition(conditions, values, "actor_id = ?", filters.actorId);
    if (filters.from) addCondition(conditions, values, "created_at >= (?::date::timestamp AT TIME ZONE 'Asia/Dhaka')", filters.from);
    if (filters.to) addCondition(conditions, values, "created_at < ((?::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka')", filters.to);
    if (filters.search) {
      values.push(`%${filters.search}%`);
      const index = values.length;
      conditions.push(`(action ILIKE $${index} OR entity_type ILIKE $${index} OR entity_id ILIKE $${index} OR actor_id::text ILIKE $${index})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM audit_logs ${where}`, values);
    const total = countResult.rows[0]?.total || 0;
    const offset = (filters.page - 1) * filters.limit;
    const result = await query(
      `SELECT id, actor_id, actor_type, action, entity_type, entity_id,
              previous_values, new_values, metadata, ip_address, user_agent,
              request_id, created_at
       FROM audit_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.limit, offset]
    );
    return {
      logs: result.rows.map(mapLog),
      pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.max(1, Math.ceil(total / filters.limit)) },
    };
  },
  async getById(id) {
    if (!UUID.test(String(id))) badRequest("Audit log ID must be a UUID.");
    const result = await query(
      `SELECT id, actor_id, actor_type, action, entity_type, entity_id,
              previous_values, new_values, metadata, ip_address, user_agent,
              request_id, created_at
       FROM audit_logs WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? mapLog(result.rows[0]) : null;
  },
};

module.exports = auditRepository;

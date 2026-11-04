const { randomUUID } = require("crypto");
const { query } = require("../config/db");
const allowedActions = new Set(require("../constants/auditActions"));
const allowedEntities = new Set([
  "USER", "PRODUCT", "INVENTORY", "ORDER", "COLLECTION", "BRAND",
  "COUPON", "DELIVERY_RULE", "HERO_SLIDER", "SYSTEM",
]);
const allowedActorTypes = new Set(["ADMIN", "CUSTOMER", "SYSTEM", "ANONYMOUS"]);
const blockedKey = /(password|token|secret|cookie|authorization|credential|card|cvv|email|phone|address|recipient|refresh|hash)/i;
const blockedString = /(bearer\s+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/i;
const securityRate = new Map();
const MAX_JSON_BYTES = 16 * 1024;

function sanitize(value, depth = 0) {
  if (depth > 6) return "[truncated]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return blockedString.test(value) ? "[redacted]" : value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (typeof value !== "object") return undefined;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (blockedKey.test(key)) continue;
    const safeValue = sanitize(child, depth + 1);
    if (safeValue !== undefined) result[key.slice(0, 100)] = safeValue;
  }
  return result;
}

function safeJson(value, fieldName) {
  if (value === null || value === undefined) return null;
  const safeValue = sanitize(value);
  const encoded = JSON.stringify(safeValue);
  if (Buffer.byteLength(encoded, "utf8") > MAX_JSON_BYTES) {
    const error = new Error(`Audit ${fieldName} exceeds the allowed size.`);
    error.code = "AUDIT_PAYLOAD_TOO_LARGE";
    throw error;
  }
  return encoded;
}

function getActorType(actor) {
  const type = String(actor?.role || (actor?.id ? "CUSTOMER" : "SYSTEM")).toUpperCase();
  return allowedActorTypes.has(type) ? type : "SYSTEM";
}

async function record(event, options = {}) {
  const {
    action, entityType, entityId = null, actor = null,
    previousValues = null, newValues = null, metadata = {},
  } = event || {};
  if (!allowedActions.has(action)) throw new Error(`Unsupported audit action '${action}'.`);
  if (!allowedEntities.has(entityType)) throw new Error(`Unsupported audit entity '${entityType}'.`);
  const request = options.request || {};
  const executor = options.client || { query };
  const actorType = getActorType(actor);
  const actorId = actor?.id && /^[0-9a-f-]{36}$/i.test(String(actor.id)) ? actor.id : null;
  const ipAddress = request.ipAddress && /^[0-9a-f:.]+$/i.test(request.ipAddress) ? request.ipAddress : null;
  const userAgent = request.userAgent ? String(request.userAgent).slice(0, 512) : null;
  const requestId = request.requestId && /^[0-9a-f-]{36}$/i.test(String(request.requestId))
    ? request.requestId
    : randomUUID();

  await executor.query(
    `INSERT INTO audit_logs
       (actor_id, actor_type, action, entity_type, entity_id, previous_values,
        new_values, metadata, ip_address, user_agent, request_id)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)`,
    [
      actorId, actorType, action, entityType, entityId == null ? null : String(entityId),
      safeJson(previousValues, "previous values"), safeJson(newValues, "new values"),
      safeJson(metadata || {}, "metadata") || "{}", ipAddress, userAgent, requestId,
    ]
  );
}

function allowSecurityEvent(action, request) {
  const ip = request?.ipAddress || "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const key = `${action}:${ip}:${minute}`;
  const count = securityRate.get(key) || 0;
  if (count >= 10) return false;
  securityRate.set(key, count + 1);
  if (securityRate.size > 5000) {
    for (const keyToDelete of securityRate.keys()) {
      if (!keyToDelete.endsWith(`:${minute}`)) securityRate.delete(keyToDelete);
    }
  }
  return true;
}

async function recordBestEffort(event, options = {}) {
  if (["LOGIN_FAILED", "ACCESS_DENIED"].includes(event?.action) && !allowSecurityEvent(event.action, options.request)) {
    return false;
  }
  try {
    await record(event, options);
    return true;
  } catch (error) {
    console.error("Audit security event could not be recorded:", error.message);
    return false;
  }
}

module.exports = { record, recordBestEffort };

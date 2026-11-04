const crypto = require("crypto");

function requestContext(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  req.auditRequest = {
    requestId,
    ipAddress: req.ip || null,
    userAgent: String(req.get("user-agent") || "").slice(0, 512) || null,
  };
  res.setHeader("X-Request-Id", requestId);
  next();
}

module.exports = requestContext;

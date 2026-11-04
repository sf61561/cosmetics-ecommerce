/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // 1. Handle known operational errors (e.g., custom 400, 409 from validation / service).
  // These are expected API outcomes, so don't print their stack traces as server failures.
  const statusCode = err.status || err.statusCode;
  if (statusCode) {
    if (statusCode >= 500) {
      console.error("Server error:", err);
    }

    return res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.field ? { field: err.field } : {}),
      ...(err.code ? { code: err.code } : {}),
    });
  }

  // 2. Handle PostgreSQL unique constraint violations (code 23505)
  if (err.code === "23505") {
    const detail = (err.detail || "").toLowerCase();
    const constraint = (err.constraint || "").toLowerCase();

    if (detail.includes("slug") || constraint.includes("slug")) {
      return res.status(409).json({
        success: false,
        message: "A product or resource with this slug already exists.",
        field: "slug",
      });
    }

    if (detail.includes("sku") || constraint.includes("sku")) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
        field: "sku",
      });
    }

    if (detail.includes("phone") || constraint.includes("phone")) {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists.",
        field: "phone",
      });
    }

    if (detail.includes("email") || constraint.includes("email")) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
        field: "email",
      });
    }

    return res.status(409).json({
      success: false,
      message: "An entity with these unique details already exists.",
    });
  }

  // 3. Handle default internal server errors
  console.error("Server error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later.",
  });
}

module.exports = errorHandler;


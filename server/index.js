const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const brandRoutes = require("./routes/brandRoutes");
const productRoutes = require("./routes/productRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const interactionRoutes = require("./routes/interactionRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const cartRoutes = require("./routes/cartRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const customerAccountRoutes = require("./routes/customerAccountRoutes");
const heroSliderRoutes = require("./routes/heroSliderRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const searchRoutes = require("./routes/searchRoutes");
const { notificationRoutes } = require("./routes/notificationRoutes");
const notificationWorker = require("./services/notificationWorker");
const errorHandler = require("./middlewares/errorHandler");
const requestContext = require("./middlewares/requestContext");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Next.js rewrites, Nginx, Cloudflare) for accurate client IP in rate limiting
app.set("trust proxy", 1);

// Allowed frontend origins (supports comma-separated URLs and local development)
const configuredClientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredClientUrls,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const allowedOriginSet = new Set(
  allowedOrigins
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients may omit Origin. Browser origins must match configured clients.
      if (!origin || allowedOriginSet.has(origin)) {
        return callback(null, true);
      }
      // Support Vercel deployment preview domains
      if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestContext);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Eloura Cosmetics Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);

// Root route aliases for auth endpoints (/auth/register, /auth/verify-email, etc.)
app.use("/auth", authRoutes);

// Root route aliases for forgot-password and reset-password
app.post("/forgot-password", (req, res, next) => {
  req.url = "/forgot-password";
  authRoutes(req, res, next);
});
app.post("/reset-password", (req, res, next) => {
  req.url = "/reset-password";
  authRoutes(req, res, next);
});
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/customer", customerAccountRoutes);
app.use("/api/hero-sliders", heroSliderRoutes);
app.use("/api/sliders", heroSliderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Eloura backend server listening on port ${PORT}`);
    console.log(`👉 Health check: http://localhost:${PORT}/api/health`);

    // Start asynchronous notification outbox worker
    notificationWorker.start();

    // Clean up stale unverified accounts (older than 72 hours) on startup and daily
    const authService = require("./services/authService");
    authService.purgeStaleUnverifiedAccounts(72).catch((err) => {
      console.warn("Initial unverified accounts cleanup skipped:", err.message);
    });
    const cleanupInterval = setInterval(() => {
      authService.purgeStaleUnverifiedAccounts(72).catch((err) => {
        console.warn("Periodic unverified accounts cleanup skipped:", err.message);
      });
    }, 24 * 60 * 60 * 1000);
    if (cleanupInterval.unref) cleanupInterval.unref();
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `⚠️ Port ${PORT} is already in use by another instance. Waiting for the port to be freed...`
      );
    } else {
      console.error("Server error:", err);
    }
  });
}

module.exports = app;

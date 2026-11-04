const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const ACCESS_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "rupkotha_default_access_secret_2026";

const REFRESH_SECRET =
  process.env.REFRESH_TOKEN_SECRET ||
  "rupkotha_default_refresh_secret_2026";

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

/**
 * Generate short-lived Access Token
 */
function generateAccessToken(user, authTime = Math.floor(Date.now() / 1000)) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "CUSTOMER",
    auth_time: authTime,
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/**
 * Generate long-lived Refresh Token
 */
function generateRefreshToken(user, rememberMe = false, authTime = Math.floor(Date.now() / 1000)) {
  const payload = {
    id: user.id,
    auth_time: authTime,
    rememberMe: Boolean(rememberMe),
    jti: crypto.randomUUID(),
  };
  const expiresIn = rememberMe ? "30d" : REFRESH_EXPIRES;
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

/**
 * Verify Access Token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify Refresh Token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

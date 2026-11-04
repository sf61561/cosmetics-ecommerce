const { Resend } = require("resend");
require("dotenv").config();

const resendApiKey = (process.env.RESEND_API_KEY || "").trim();

let resend = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
  console.log("📧 Resend Email client successfully initialized.");
} else {
  console.warn(
    "⚠️ RESEND_API_KEY is not set in server/.env. Verification emails will be logged to console in development."
  );
}

module.exports = resend;


const resend = require("../config/resend");
require("dotenv").config();

class EmailService {
  async sendPasswordSetupEmail({ to, name, setupUrl }) {
    if (!resend) throw new Error("Password setup email is not configured.");
    const safeName = String(name || "there").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>",
      to: [to],
      subject: "Set your RupKotha password",
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#29252A;background:#FBF0F0;padding:32px"><main style="max-width:520px;margin:auto;background:white;border-radius:16px;padding:32px"><h1 style="color:#9B4F5E">RupKotha</h1><h2>Hello ${safeName},</h2><p>Use the button below to set a password for your existing account. Your linked sign-in provider will continue to work.</p><p><a href="${setupUrl}" style="display:inline-block;background:#9B4F5E;color:#fff;padding:13px 22px;border-radius:24px;text-decoration:none;font-weight:bold">Set password</a></p><p>This one-time link expires in 30 minutes. If you did not request it, you can ignore this email.</p></main></body></html>`,
    });
    if (error) throw new Error("Password setup email delivery failed.");
    return { success: true };
  }

  async sendPasswordResetEmail({ to, name, resetUrl, isProviderOnly = false, providerName = "Google" }) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";
    const safeName = String(name || "there").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);

    const titleText = isProviderOnly ? "Set your password" : "Reset your password";
    const bodyText = isProviderOnly
      ? `You signed up with ${providerName || "Google"}. You can keep using it, or choose a password using the link below.`
      : "We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.";
    const buttonText = isProviderOnly ? "Set password" : "Reset password";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titleText} - RupKotha</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fcf8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf8f8; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; color: #374151; font-weight: 600; letter-spacing: 0.5px;">
                      RupKotha <span style="color: #9B7CB8; font-size: 20px;">&#10047;</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">${isProviderOnly ? "Password Setup" : "Password Reset"}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1f2937; font-weight: 600;">
                      Hello ${safeName},
                    </h2>
                    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      ${bodyText}
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #9B4F5E; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(155, 79, 94, 0.3);">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #6b7280;">
                      This link expires in <strong>30 minutes</strong>. If you didn&apos;t request this, you can ignore this email. Your password won&apos;t change.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      &copy; ${new Date().getFullYear()} RupKotha Cosmetics. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log("\n==================================================");
      console.log("📧 [DEV MOCK EMAIL] Password Reset Email for:", to);
      console.log("🔗 Reset URL:", resetUrl);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: isProviderOnly ? "Set your password" : "Reset your password",
        html: htmlContent,
      });
      if (error) throw new Error(error.message || "Failed to send email via Resend");
      return { success: true, data };
    } catch (error) {
      console.error("Password reset email delivery error:", error.message || error);
      throw error;
    }
  }

  async sendPasswordChangedConfirmationEmail({ to, name }) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";
    const safeName = String(name || "there").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - RupKotha</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fcf8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf8f8; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; color: #374151; font-weight: 600; letter-spacing: 0.5px;">
                      RupKotha <span style="color: #9B7CB8; font-size: 20px;">&#10047;</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Security Notice</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1f2937; font-weight: 600;">
                      Hello ${safeName},
                    </h2>
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      Your RupKotha account password was recently changed. All active sessions have been invalidated for security.
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                      If you made this change, you can safely disregard this notice. If you did <strong>not</strong> make this change, please contact our support team immediately at <a href="mailto:support@rupkotha.com" style="color: #9B4F5E; text-decoration: underline;">support@rupkotha.com</a> to secure your account.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      &copy; ${new Date().getFullYear()} RupKotha Cosmetics. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log("\n==================================================");
      console.log("📧 [DEV MOCK EMAIL] Password Changed Confirmation for:", to);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: "Your RupKotha password has been changed",
        html: htmlContent,
      });
      if (error) console.warn("Password change confirmation email error:", error.message);
      return { success: true, data };
    } catch (error) {
      console.warn("Password change confirmation email delivery failed:", error.message || error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail({ to, name, verificationUrl }) {
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - RupKotha</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fcf8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf8f8; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
                <!-- Header / Brand Banner -->
                <tr>
                  <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; color: #374151; font-weight: 600; letter-spacing: 0.5px;">
                      RupKotha <span style="color: #9B7CB8; font-size: 20px;">&#10047;</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Cosmetics & Beauty</p>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 32px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1f2937; font-weight: 600;">
                      Welcome, ${name || "valued customer"}!
                    </h2>
                    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      Thank you for creating an account with <strong>RupKotha</strong>. To ensure the security of your account and verify your email address, please click the button below:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #9B4F5E; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(155, 79, 94, 0.3);">
                            Verify My Email
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #6b7280;">
                      This verification link will expire in <strong>24 hours</strong>. If you did not create an account with RupKotha, you can safely ignore this email.
                    </p>

                    <hr style="border: none; border-top: 1px solid #f3e2e5; margin: 24px 0;" />

                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
                      If the button above does not work, copy and paste this URL into your browser:<br />
                      <a href="${verificationUrl}" target="_blank" style="color: #9B4F5E; word-break: break-all;">${verificationUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      &copy; ${new Date().getFullYear()} RupKotha Cosmetics. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // If Resend client is not initialized (e.g. key missing in dev), log to console
    if (!resend) {
      console.log("\n==================================================");
      console.log("📨 [DEV MOCK EMAIL] Verification Email for:", to);
      console.log("🔗 Verification URL:", verificationUrl);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: "Verify your email",
        html: htmlContent,
      });

      if (error) {
        console.error("❌ Resend API error:", error);
        throw new Error(error.message || "Failed to send email via Resend");
      }

      console.log(
        `✅ Verification email successfully sent to ${to} (Message ID: ${data?.id})`
      );
      return { success: true, data };
    } catch (error) {
      console.error("Resend email delivery error:", error.message || error);
      throw error;
    }
  }

  /**
   * Send notification to a verified user when an account registration is attempted with their email
   */
  async sendAccountExistsEmail({ to, name }) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";
    const safeName = String(name || "there").replace(/[&<>\"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    })[char]);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const loginUrl = `${clientUrl.replace(/\/$/, "")}/auth/login`;
    const resetUrl = `${clientUrl.replace(/\/$/, "")}/auth/reset-password`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Notice - RupKotha</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fcf8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf8f8; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; color: #374151; font-weight: 600; letter-spacing: 0.5px;">
                      RupKotha <span style="color: #9B7CB8; font-size: 20px;">&#10047;</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Security Notice</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1f2937; font-weight: 600;">
                      Hello ${safeName},
                    </h2>
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      Someone recently attempted to create a new RupKotha account using your email address (<strong>${to}</strong>).
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                      Because you already have an account with us, no new account was created. If this was you, you can simply sign in below or reset your password if you’ve forgotten it.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #9B4F5E; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(155, 79, 94, 0.3);">
                            Sign In to Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #6b7280;">
                      Forgot your password? You can <a href="${resetUrl}" style="color: #9B4F5E; text-decoration: underline;">reset your password here</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      &copy; ${new Date().getFullYear()} RupKotha Cosmetics. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log("\n==================================================");
      console.log("📧 [DEV MOCK EMAIL] Account Exists Notification for:", to);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: "RupKotha Account Notice",
        html: htmlContent,
      });
      if (error) console.warn("Account exists notification email error:", error.message);
      return { success: true, data };
    } catch (error) {
      console.warn("Account exists notification email delivery failed:", error.message || error);
      return { success: false, error: error.message };
    }
  }

  async sendOrderPlacedConfirmationEmail({ to, name, orderNumber, totalAmount, items = [], address = {} }) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";
    const safeName = name ? String(name).trim() : "Valued Customer";
    const formattedAmount = `৳${Number(totalAmount || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
    const itemsHtml = items.map((i) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3e2e5; font-size: 14px; color: #374151;">
          ${i.name || i.product_name} × ${i.quantity}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3e2e5; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">
          ৳${Number(i.lineTotal || i.line_total || 0).toLocaleString("en-BD")}
        </td>
      </tr>
    `).join("");

    const htmlContent = `
      <!doctype html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf5f6; margin: 0; padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
          <tr>
            <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
              <h1 style="color: #9B4F5E; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">RupKotha</h1>
              <p style="color: #71717a; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 1px;">Order Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 12px;">Thank you for your order!</h2>
              <p style="font-size: 14px; color: #52525b; line-height: 1.6; margin: 0 0 16px;">
                Hello <strong>${safeName}</strong>, your order <strong>${orderNumber}</strong> has been received and is currently <strong>pending review</strong>.
              </p>
              <div style="background-color: #faf5f6; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 13px; color: #71717a;">Order Number: <strong style="color: #9B4F5E;">${orderNumber}</strong></p>
                <p style="margin: 0; font-size: 13px; color: #71717a;">Total Amount: <strong style="color: #111827;">${formattedAmount} (Cash on Delivery)</strong></p>
              </div>
              <h3 style="font-size: 15px; font-weight: 600; color: #18181b; margin: 0 0 12px;">Items ordered:</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${itemsHtml}
              </table>
              ${address.recipientName || address.recipient_name ? `
                <div style="border-top: 1px solid #f3e2e5; pt-4; margin-top: 16px;">
                  <p style="font-size: 13px; color: #71717a; margin: 12px 0 4px;">Delivery Address:</p>
                  <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">
                    ${address.recipientName || address.recipient_name}<br />
                    ${address.phone || address.recipient_phone}<br />
                    ${address.streetAddress || address.delivery_street_address || ""}, ${address.area || address.delivery_area || ""}, ${address.district || address.delivery_district || ""}
                  </p>
                </div>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
              <p style="font-size: 12px; color: #71717a; margin: 0;">© ${new Date().getFullYear()} RupKotha Cosmetics. Guaranteed authentic beauty.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log("\n==================================================");
      console.log("📧 [DEV MOCK EMAIL] Order Placed:", orderNumber, "for", to);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: `RupKotha Order Confirmation: ${orderNumber}`,
        html: htmlContent,
      });
      if (error) console.warn("Order confirmation email error:", error.message);
      return { success: true, data };
    } catch (error) {
      console.warn("Order confirmation email delivery failed:", error.message || error);
      return { success: false, error: error.message };
    }
  }

  async sendOrderStatusChangedEmail({ to, name, orderNumber, status, courierName, trackingNumber, note }) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "RupKotha <onboarding@resend.dev>";
    const safeName = name ? String(name).trim() : "Valued Customer";
    const statusLabels = {
      pending: "Pending Review",
      confirmed: "Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
    };
    const displayStatus = statusLabels[status?.toLowerCase()] || status;

    const htmlContent = `
      <!doctype html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf5f6; margin: 0; padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3e2e5; box-shadow: 0 4px 16px rgba(155, 79, 94, 0.08); overflow: hidden;">
          <tr>
            <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(135deg, #fcecee 0%, #f7e6ea 100%); border-bottom: 1px solid #f3e2e5;">
              <h1 style="color: #9B4F5E; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">RupKotha</h1>
              <p style="color: #71717a; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 1px;">Order Status Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 12px;">Order Status: ${displayStatus}</h2>
              <p style="font-size: 14px; color: #52525b; line-height: 1.6; margin: 0 0 16px;">
                Hello <strong>${safeName}</strong>, your order <strong>${orderNumber}</strong> status has been updated to <strong>${displayStatus}</strong>.
              </p>
              ${courierName || trackingNumber ? `
                <div style="background-color: #faf5f6; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
                  ${courierName ? `<p style="margin: 0 0 6px; font-size: 13px; color: #71717a;">Courier: <strong style="color: #111827;">${courierName}</strong></p>` : ""}
                  ${trackingNumber ? `<p style="margin: 0; font-size: 13px; color: #71717a;">Tracking Number: <strong style="color: #9B4F5E;">${trackingNumber}</strong></p>` : ""}
                </div>
              ` : ""}
              ${note ? `
                <p style="font-size: 13px; color: #6b7280; font-style: italic; margin-top: 12px;">Note: ${note}</p>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px; background-color: #faf5f6; border-top: 1px solid #f3e2e5;">
              <p style="font-size: 12px; color: #71717a; margin: 0;">© ${new Date().getFullYear()} RupKotha Cosmetics.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log("\n==================================================");
      console.log("📧 [DEV MOCK EMAIL] Order", orderNumber, "Status:", displayStatus, "for", to);
      console.log("==================================================\n");
      return { success: true, mocked: true };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: `Order Update for ${orderNumber}: ${displayStatus}`,
        html: htmlContent,
      });
      if (error) console.warn("Order status update email error:", error.message);
      return { success: true, data };
    } catch (error) {
      console.warn("Order status update email delivery failed:", error.message || error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();


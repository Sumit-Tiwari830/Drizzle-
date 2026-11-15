import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

export type OtpEmailType = "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN";

export class EmailService {
  private static resendClient: Resend | null = null;

  private static getClient(): Resend | null {
    if (!this.resendClient && process.env.RESEND_API_KEY) {
      this.resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return this.resendClient;
  }

  private static getEmailDetails(type: OtpEmailType, otp: string) {
    switch (type) {
      case "EMAIL_VERIFICATION":
        return {
          subject: `🔐 Verify Your Dating App Account - Code: ${otp}`,
          heading: "Confirm Your Email Address",
          subheading: "Thank you for joining! Please use the 6-digit verification code below to verify your email.",
          callout: "This code is valid for 10 minutes. For your security, do not share this code with anyone.",
        };
      case "PASSWORD_RESET":
        return {
          subject: `🔑 Password Reset Verification - Code: ${otp}`,
          heading: "Reset Your Password",
          subheading: "We received a request to reset your password. Use the verification code below to proceed.",
          callout: "This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.",
        };
      case "LOGIN":
      default:
        return {
          subject: `🛡️ Login Verification Code - Code: ${otp}`,
          heading: "Two-Factor Verification",
          subheading: "Use the code below to securely log into your account.",
          callout: "This code expires in 10 minutes. If you did not attempt to log in, please secure your account immediately.",
        };
    }
  }

  /**
   * Dispatches a branded HTML OTP verification email using the Resend API
   */
  static async sendOtpEmail(
    toEmail: string,
    otp: string,
    type: OtpEmailType = "EMAIL_VERIFICATION"
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const details = this.getEmailDetails(type, otp);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("[EmailService] RESEND_API_KEY is not defined. Email simulated in console for:", toEmail);
      return { success: true, messageId: "simulated-no-api-key" };
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${details.subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 28px; font-weight: 800; color: #e11d48; letter-spacing: -0.5px; }
        h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 16px 0 8px; text-align: center; }
        p { font-size: 15px; line-height: 1.6; color: #475569; margin: 8px 0; text-align: center; }
        .otp-box { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border: 2px dashed #fb7185; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #e11d48; }
        .callout { font-size: 13px; color: #64748b; background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin: 20px 0; border-left: 4px solid #94a3b8; text-align: left; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✨ Spark Dating</div>
          <h1>${details.heading}</h1>
          <p>${details.subheading}</p>
        </div>
        
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>

        <div class="callout">
          <strong>Security Note:</strong> ${details.callout}
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Spark Dating Inc. All rights reserved.<br>
          This is an automated security transmission. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      const client = this.getClient();
      if (!client) {
        throw new Error("Resend client failed to initialize");
      }

      const response = await client.emails.send({
        from: fromAddress,
        to: toEmail,
        subject: details.subject,
        html: htmlContent,
      });

      if (response.error) {
        console.warn(`[EmailService] Resend API returned error for ${toEmail}:`, response.error);
        return { success: false, error: response.error.message };
      }

      return { success: true, messageId: response.data?.id };
    } catch (err: any) {
      console.warn(`[EmailService] Failed to send email to ${toEmail}:`, err?.message || err);
      // Graceful fallback: Do not hard crash during local dev / sandbox domain restrictions
      return { success: false, error: err?.message || "Unknown email dispatch error" };
    }
  }
}

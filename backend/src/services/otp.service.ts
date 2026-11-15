import crypto from "node:crypto";
import { db } from "../db/index.js";
import { otps } from "../db/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { ApiError } from "../utils/apiError.js";
import { EmailService, OtpEmailType } from "./email.service.js";

export class OtpService {
  private static COOLDOWN_SECONDS = 60; // 60 seconds resend cooldown
  private static EXPIRY_MINUTES = 10; // 10 minutes OTP validity
  private static MAX_ATTEMPTS = 5; // Max 5 incorrect attempts

  /**
   * Generates, hashes, stores, and dispatches a 6-digit OTP code.
   */
  static async generateAndSendOtp(
    emailInput: string,
    type: OtpEmailType = "EMAIL_VERIFICATION"
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number; expiresAt: Date; rawOtp?: string }> {
    const email = emailInput.trim().toLowerCase();

    // 1. Check Resend Cooldown (60s throttling)
    const [latestOtp] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.email, email), eq(otps.type, type), eq(otps.isUsed, false)))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    const now = new Date();
    if (latestOtp) {
      const elapsedMs = now.getTime() - new Date(latestOtp.createdAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      if (elapsedSeconds < this.COOLDOWN_SECONDS) {
        const remaining = this.COOLDOWN_SECONDS - elapsedSeconds;
        throw new ApiError(
          429,
          `Please wait ${remaining} second${remaining === 1 ? "" : "s"} before requesting another verification code.`
        );
      }

      // Invalidate the older active OTP since a new one is requested
      await db.update(otps).set({ isUsed: true }).where(eq(otps.id, latestOtp.id));
    }

    // 2. Generate cryptographically strong 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 3. Hash OTP before saving (Zero plaintext storage)
    const otpHash = await hashPassword(rawOtp);
    const expiresAt = new Date(now.getTime() + this.EXPIRY_MINUTES * 60 * 1000);

    // 4. Save to Database
    await db.insert(otps).values({
      email,
      otpHash,
      type,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // 5. Dispatch via Resend Email Service
    await EmailService.sendOtpEmail(email, rawOtp, type);

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
      cooldownSeconds: this.COOLDOWN_SECONDS,
      expiresAt,
      // Include rawOtp only during automated tests / non-production inspection
      ...(process.env.NODE_ENV === "test" ? { rawOtp } : {}),
    };
  }

  /**
   * Verifies the provided OTP code against the hashed record in PostgreSQL.
   */
  static async verifyOtp(
    emailInput: string,
    rawOtpInput: string,
    type: OtpEmailType = "EMAIL_VERIFICATION"
  ): Promise<boolean> {
    const email = emailInput.trim().toLowerCase();
    const rawOtp = (rawOtpInput || "").trim();

    if (!rawOtp || rawOtp.length !== 6) {
      throw new ApiError(400, "Please provide a valid 6-digit verification code");
    }

    // 1. Fetch latest unused OTP for this email & type
    const [otpRecord] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.email, email), eq(otps.type, type), eq(otps.isUsed, false)))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (!otpRecord) {
      throw new ApiError(400, "No active verification code found. Please request a new code.");
    }

    const now = new Date();

    // 2. Check Expiration
    if (now > new Date(otpRecord.expiresAt)) {
      await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));
      throw new ApiError(400, "Verification code has expired. Please request a new code.");
    }

    // 3. Check Brute-Force Attempts
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));
      throw new ApiError(400, "Too many failed attempts. This code is now invalid. Please request a new code.");
    }

    // 4. Validate OTP Hash
    const isMatch = await comparePassword(rawOtp, otpRecord.otpHash);

    if (!isMatch) {
      const updatedAttempts = otpRecord.attempts + 1;
      const isInvalidated = updatedAttempts >= this.MAX_ATTEMPTS;

      await db
        .update(otps)
        .set({
          attempts: updatedAttempts,
          isUsed: isInvalidated,
        })
        .where(eq(otps.id, otpRecord.id));

      if (isInvalidated) {
        throw new ApiError(400, "Incorrect verification code. Maximum attempts reached. Code has been invalidated.");
      }

      const remainingAttempts = this.MAX_ATTEMPTS - updatedAttempts;
      throw new ApiError(
        400,
        `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
      );
    }

    // 5. Successful Verification -> Invalidate OTP
    await db.update(otps).set({ isUsed: true }).where(eq(otps.id, otpRecord.id));

    return true;
  }
}

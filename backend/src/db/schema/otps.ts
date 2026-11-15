import { pgTable, uuid, varchar, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";

/**
 * OTP (One-Time Password) Table
 * Securely stores hashed OTPs for email verification, password resets, and 2FA.
 * - Plaintext OTP is NEVER stored in database (hashed with bcrypt).
 * - Expiration window: 10 minutes.
 * - Brute-force protection: Max 5 failed attempts per OTP.
 */
export const otps = pgTable(
  "otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    otpHash: varchar("otp_hash", { length: 255 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(), // 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").default(false).notNull(),
    attempts: integer("attempts").default(0).notNull(), // Failed attempt counter
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("otps_email_type_idx").on(table.email, table.type, table.isUsed),
  ]
);

export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;

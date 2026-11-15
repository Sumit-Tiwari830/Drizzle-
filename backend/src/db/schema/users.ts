import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * App Users Table
 * - isVerified: true if verified against master_directory or approved by admin
 * - isLocked: true when actively matched (cannot send or receive requests)
 * - isDeleted: soft-delete flag (does NOT delete from master_directory!)
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).default("USER").notNull(), // 'USER' | 'ADMIN'
    isVerified: boolean("is_verified").default(false).notNull(),
    isEmailVerified: boolean("is_email_verified").default(false).notNull(), // OTP Email verification
    isLocked: boolean("is_locked").default(false).notNull(), // Locked when in an active match
    isDeleted: boolean("is_deleted").default(false).notNull(), // Soft delete flag
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_status_idx").on(table.isLocked, table.isDeleted),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * User Devices Table for Mobile & Web Push Notifications
 * Stores FCM (Firebase Cloud Messaging) / APNs device tokens.
 */
export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: varchar("token", { length: 500 }).notNull(),
    platform: varchar("platform", { length: 20 }).default("android").notNull(), // 'android' | 'ios' | 'web'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_devices_user_token_idx").on(table.userId, table.token),
    index("user_devices_user_idx").on(table.userId),
  ]
);

export type UserDevice = typeof userDevices.$inferSelect;
export type NewUserDevice = typeof userDevices.$inferInsert;

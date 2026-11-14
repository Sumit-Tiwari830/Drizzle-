import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Connect Requests Table
 * - Max 10 requests allowed per user in any rolling 24-hour window.
 * - Sender & receiver must NOT be in an active match (isLocked must be false).
 * - When accepted, both users enter an exclusive match and become locked!
 */
export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

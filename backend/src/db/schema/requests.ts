import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Connect Requests Table
 * - Max 10 requests allowed per user in any rolling 24-hour window.
 * - Sender & receiver must NOT be in an active match (isLocked must be false).
 * - When accepted, both users enter an exclusive match and become locked!
 */
export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    receiverId: uuid("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(), // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    // Optimizes rolling 24-hr count query at scale (WHERE sender_id = ? AND created_at >= ?)
    index("requests_sender_window_idx").on(table.senderId, table.createdAt),
    // Optimizes incoming requests query (WHERE receiver_id = ? AND status = 'PENDING')
    index("requests_receiver_status_idx").on(table.receiverId, table.status),
  ]
);

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

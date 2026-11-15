import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Matches Table
 * Represents an exclusive active pair between two users.
 * Rules:
 * - ACTIVE: both user1 and user2 are locked (cannot send/receive other requests).
 * - Profile Reveal: mutually unlocked when both user1RevealAccepted AND user2RevealAccepted are true (or if isPublicReveal is true).
 * - Unmatch: if either side unmatches, status becomes 'UNMATCHED', both users are unlocked, and both are allowed to update their username!
 */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user1Id: uuid("user1_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    user2Id: uuid("user2_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    status: varchar("status", { length: 20 }).default("ACTIVE").notNull(), // 'ACTIVE' | 'UNMATCHED'
    user1RevealAccepted: boolean("user1_reveal_accepted").default(false).notNull(),
    user2RevealAccepted: boolean("user2_reveal_accepted").default(false).notNull(),
    matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
    unmatchedAt: timestamp("unmatched_at", { withTimezone: true }),
    unmatchedBy: uuid("unmatched_by").references(() => users.id),
  },
  (table) => [
    uniqueIndex("unique_active_pair_idx")
      .on(table.user1Id, table.user2Id)
      .where(sql`${table.status} = 'ACTIVE'`),
  ]
);

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
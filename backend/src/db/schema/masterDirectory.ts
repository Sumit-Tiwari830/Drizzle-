import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Master Directory ("Actual / Truth Database")
 * Populated via:
 * 1. Admin Excel (.xlsx) sheet upload
 * 2. Admin verification of unverified users
 * Note: Never deleted or affected when a user deletes their app account!
 */
export const masterDirectory = pgTable("master_directory", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  actualName: varchar("actual_name", { length: 150 }).notNull(),
  officialGender: varchar("official_gender", { length: 20 }).notNull(), // 'male' | 'female' | 'other'
  departmentOrBatch: varchar("department_or_batch", { length: 100 }),
  verifiedByAdmin: boolean("verified_by_admin").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MasterDirectoryRecord = typeof masterDirectory.$inferSelect;
export type NewMasterDirectoryRecord = typeof masterDirectory.$inferInsert;

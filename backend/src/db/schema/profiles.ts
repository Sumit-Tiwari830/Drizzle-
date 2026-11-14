import { pgTable, uuid, varchar, date, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * User Profiles Table (Anonymous-first / Privacy-first)
 * - username: pseudonym shown initially (changeable by user after unmatch!)
 * - actualName: official name; hidden initially unless profile reveal condition is met
 * - avatarUrl: anonymous avatar shown initially
 * - realPhotos: array of real photo URLs; hidden initially
 * - isPublicReveal: user setting to reveal real name & photos to all users at any time
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  actualName: varchar("actual_name", { length: 150 }).notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  dob: date("dob").notNull(),
  bio: text("bio"),
  interests: jsonb("interests").$type<string[]>().default([]).notNull(),
  lookingFor: varchar("looking_for", { length: 50 }).default("Long-term relationship"),
  interestedIn: varchar("interested_in", { length: 20 }).default("everyone").notNull(),
  city: varchar("city", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }).default("https://api.dicebear.com/7.x/bottts/svg?seed=dating").notNull(),
  realPhotos: jsonb("real_photos").$type<string[]>().default([]).notNull(),
  isPublicReveal: boolean("is_public_reveal").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

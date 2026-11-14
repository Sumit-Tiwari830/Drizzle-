import { relations } from "drizzle-orm";
import { masterDirectory } from "./masterDirectory.js";
import { users } from "./users.js";
import { profiles } from "./profiles.js";
import { requests } from "./requests.js";
import { matches } from "./matches.js";

export { masterDirectory } from "./masterDirectory.js";
export { users } from "./users.js";
export { profiles } from "./profiles.js";
export { requests } from "./requests.js";
export { matches } from "./matches.js";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  sentRequests: many(requests, { relationName: "sentRequests" }),
  receivedRequests: many(requests, { relationName: "receivedRequests" }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  sender: one(users, {
    fields: [requests.senderId],
    references: [users.id],
    relationName: "sentRequests",
  }),
  receiver: one(users, {
    fields: [requests.receiverId],
    references: [users.id],
    relationName: "receivedRequests",
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
    relationName: "user1",
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
    relationName: "user2",
  }),
}));

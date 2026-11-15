import { relations } from "drizzle-orm";
import { masterDirectory } from "./masterDirectory";
import { users } from "./users";
import { profiles } from "./profiles";
import { requests } from "./requests";
import { matches } from "./matches";
import { otps } from "./otps";

export { masterDirectory } from "./masterDirectory";
export { users } from "./users";
export { profiles } from "./profiles";
export { requests } from "./requests";
export { matches } from "./matches";
export { otps } from "./otps";

export type { MasterDirectoryRecord, NewMasterDirectoryRecord } from "./masterDirectory";
export type { User, NewUser } from "./users";
export type { Profile, NewProfile } from "./profiles";
export type { Request as RequestRecord, NewRequest as NewRequestRecord } from "./requests";
export type { Match, NewMatch } from "./matches";
export type { Otp, NewOtp } from "./otps";

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

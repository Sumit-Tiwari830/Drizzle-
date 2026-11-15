import { db } from "../../db/index.js";
import { matches, users, profiles, Profile } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";
import { Message } from "../../db/msg_schema.js";
import { NotificationService } from "../notifications/notification.service.js";
import { Server } from "socket.io";

export class MatchService {
  /**
   * Get Current Active Match
   * Includes mutual profile reveal checking:
   * Real name and real photos are ONLY shown if:
   * 1. Partner has enabled public profile reveal (isPublicReveal = true), OR
   * 2. Both candidates accepted the profile reveal condition (user1RevealAccepted && user2RevealAccepted).
   */
  static async getMyMatch(userId: string) {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!match) {
      return null;
    }

    const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id;

    const [partnerProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, partnerId))
      .limit(1);

    if (!partnerProfile) {
      throw new ApiError(404, "Partner profile not found");
    }

    // Check if profile reveal is mutually unlocked or publicly enabled
    const isMutuallyRevealed = match.user1RevealAccepted && match.user2RevealAccepted;
    const isRevealed = partnerProfile.isPublicReveal || isMutuallyRevealed;

    // Filter partner profile data based on privacy condition
    const sanitizedPartner = {
      userId: partnerProfile.userId,
      username: partnerProfile.username,
      avatarUrl: partnerProfile.avatarUrl,
      gender: partnerProfile.gender,
      dob: partnerProfile.dob,
      bio: partnerProfile.bio,
      interests: partnerProfile.interests,
      lookingFor: partnerProfile.lookingFor,
      city: partnerProfile.city,
      isRevealed,
      actualName: isRevealed ? partnerProfile.actualName : "[HIDDEN - Awaiting Mutual Profile Reveal]",
      realPhotos: isRevealed ? partnerProfile.realPhotos : [],
    };

    const isUser1 = match.user1Id === userId;
    const myRevealAccepted = isUser1 ? match.user1RevealAccepted : match.user2RevealAccepted;
    const partnerRevealAccepted = isUser1 ? match.user2RevealAccepted : match.user1RevealAccepted;

    return {
      matchId: match.id,
      matchedAt: match.matchedAt,
      myRevealAccepted,
      partnerRevealAccepted,
      isMutuallyRevealed,
      partner: sanitizedPartner,
    };
  }

  /**
   * Request / Accept Mutual Profile Reveal
   * When both matched candidates accept, both see each other's actual name and real photos.
   */
  static async requestProfileReveal(matchId: string, userId: string) {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!match) {
      throw new ApiError(404, "Active match not found");
    }

    const isUser1 = match.user1Id === userId;
    const updates = isUser1
      ? { user1RevealAccepted: true }
      : { user2RevealAccepted: true };

    const [updatedMatch] = await db
      .update(matches)
      .set(updates)
      .where(eq(matches.id, matchId))
      .returning();

    const bothAccepted = updatedMatch.user1RevealAccepted && updatedMatch.user2RevealAccepted;

    return {
      message: bothAccepted
        ? "Both candidates accepted! Profiles are now fully revealed to each other."
        : "Reveal request recorded. Waiting for your match partner to accept.",
      isMutuallyRevealed: bothAccepted,
    };
  }

  /**
   * Unmatch Pair
   * - If either side unmatches, both sides become UNMATCHED.
   * - Both candidates are UNLOCKED (isLocked = false) and become available again!
   * - Both candidates can now change their username if they desire.
   */
  static async unmatch(matchId: string, userId: string, io?: Server) {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, matchId),
          or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
          eq(matches.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!match) {
      throw new ApiError(404, "Active match not found");
    }

    const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // Fetch unmatcher's pseudonym profile for notification details
    const [unmatcherProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const unmatcherUsername = unmatcherProfile?.username || "Your match";

    // 1. Mark match UNMATCHED
    await db
      .update(matches)
      .set({
        status: "UNMATCHED",
        unmatchedAt: new Date(),
        unmatchedBy: userId,
      })
      .where(eq(matches.id, matchId));

    // 2. UNLOCK BOTH users (make both available again)
    await db
      .update(users)
      .set({ isLocked: false })
      .where(or(eq(users.id, match.user1Id), eq(users.id, match.user2Id)));

    // 3. Immediately delete all chat message history from MongoDB
    await Message.deleteMany({ matchId });

    // 4. Send automated notification to the partner's MongoDB notification box
    await NotificationService.createNotification(
      partnerId,
      "UNMATCHED",
      "You have been unmatched",
      `Your match with @${unmatcherUsername} has ended. You are now unlocked, free to connect with new candidates, and you can update your username.`,
      {
        matchId,
        unmatchedBy: userId,
        unmatchedByUsername: unmatcherUsername,
        unmatchedAt: new Date(),
      },
      io
    );

    return {
      message: "Successfully unmatched. Both candidates are now unlocked, available for new requests, chat history has been deleted, and partner has been notified.",
    };
  }
}

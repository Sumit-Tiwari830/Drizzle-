import { db } from "../../db/index.js";
import { matches, users, profiles, Profile } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";
import { Message } from "../../db/msg_schema.js";
import { NotificationService } from "../notifications/notification.service.js";
import { Server } from "socket.io";
import { calculateAge } from "../../utils/date.js";

export class MatchService {
  public static readonly ICEBREAKER_HOURS = 48; // 48-hour first message window
  public static readonly ICEBREAKER_MS = 48 * 60 * 60 * 1000;

  /**
   * Auto-expire a ghost match where 48 hours passed without any message
   * Unlocks both candidates and sends automated notifications
   */
  static async autoExpireGhostMatch(matchId: string, user1Id: string, user2Id: string, io?: Server) {
    await db.transaction(async (tx) => {
      // 1. Mark match UNMATCHED
      await tx
        .update(matches)
        .set({
          status: "UNMATCHED",
          unmatchedAt: new Date(),
          unmatchedBy: null, // System automated expiry
        })
        .where(eq(matches.id, matchId));

      // 2. Unlock both candidates
      await tx
        .update(users)
        .set({ isLocked: false })
        .where(or(eq(users.id, user1Id), eq(users.id, user2Id)));
    });

    // 3. Purge MongoDB messages (if any)
    await Message.deleteMany({ matchId });

    // 4. Send automated in-app & push notification to both users
    const expiryTitle = "Match Expired (48-Hour Inactivity)";
    const expiryMsg = "Your match has automatically expired because no messages were sent within 48 hours. You are now unlocked to discover new profiles!";

    await NotificationService.createNotification(
      user1Id,
      "UNMATCHED",
      expiryTitle,
      expiryMsg,
      { matchId, reason: "ICEBREAKER_48H_EXPIRED" },
      io
    );

    await NotificationService.createNotification(
      user2Id,
      "UNMATCHED",
      expiryTitle,
      expiryMsg,
      { matchId, reason: "ICEBREAKER_48H_EXPIRED" },
      io
    );

    // 5. Broadcast socket event to room
    if (io) {
      io.to(`match_${matchId}`).emit("match_ended", { matchId, reason: "ICEBREAKER_48H_EXPIRED" });
    }
  }

  /**
   * Get Current Active Match
   * Includes 48-Hour Icebreaker Ghosting Check:
   * If 48 hours have passed since matching and 0 messages have been sent,
   * the match is automatically dissolved and both users unlocked.
   */
  static async getMyMatch(userId: string, io?: Server) {
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

    // 48-Hour First-Message Icebreaker Check
    const now = new Date();
    const matchedAt = new Date(match.matchedAt);
    const icebreakerDeadline = new Date(matchedAt.getTime() + MatchService.ICEBREAKER_MS);
    const messageCount = await Message.countDocuments({ matchId: match.id });

    if (now.getTime() >= icebreakerDeadline.getTime() && messageCount === 0) {
      // 48-Hour Icebreaker expired with 0 messages: Break Deadlock!
      await this.autoExpireGhostMatch(match.id, match.user1Id, match.user2Id, io);
      return null; // Both candidates are now unlocked!
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
      age: calculateAge(partnerProfile.dob), // Always visible
      height: partnerProfile.height, // Always visible
      region: partnerProfile.isRegionVisible || isRevealed ? partnerProfile.region : "[HIDDEN - Private]", // Visible when user wants
      isRegionVisible: partnerProfile.isRegionVisible,
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

    const icebreakerRemainingHours = Math.max(
      0,
      Math.round((icebreakerDeadline.getTime() - now.getTime()) / (60 * 60 * 1000))
    );

    return {
      matchId: match.id,
      matchedAt: match.matchedAt,
      icebreakerDeadline,
      icebreakerRemainingHours,
      messagesExchangedCount: messageCount,
      hasStartedChat: messageCount > 0,
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

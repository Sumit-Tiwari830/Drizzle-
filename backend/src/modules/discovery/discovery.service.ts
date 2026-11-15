import { db } from "../../db/index.js";
import { users, profiles, requests, matches } from "../../db/schema/index.js";
import { eq, and, notInArray, sql } from "drizzle-orm";

export class DiscoveryService {
  /**
   * Get Candidate Feed for Discovery
   * Rules:
   * - Candidates locked in an active match (isLocked = true) are HIDDEN.
   * - Deleted users (isDeleted = true) are HIDDEN.
   * - Current user is excluded.
   * - Privacy: If candidate has isPublicReveal = false, actualName and realPhotos are hidden!
   * - Ex-Match Warning: Warns user if they previously matched and unmatched with a candidate (even if username changed).
   */
  static async getFeed(currentUserId: string, page: number = 1, limit: number = 20) {
    const offset = Math.max(0, (page - 1) * limit);

    // 1. Fetch current user profile to check preferences
    const [myProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, currentUserId))
      .limit(1);

    // 2. Find all userIds with whom current user already has an active pending request
    const existingRequests = await db
      .select({
        senderId: requests.senderId,
        receiverId: requests.receiverId,
      })
      .from(requests)
      .where(
        and(
          eq(requests.status, "PENDING"),
          sql`(${requests.senderId} = ${currentUserId} OR ${requests.receiverId} = ${currentUserId})`
        )
      );

    const excludedUserIds = new Set<string>([currentUserId]);
    for (const req of existingRequests) {
      excludedUserIds.add(req.senderId);
      excludedUserIds.add(req.receiverId);
    }

    // 3. Find all past UNMATCHED records involving currentUserId to warn about ex-matches
    const pastUnmatches = await db
      .select({
        user1Id: matches.user1Id,
        user2Id: matches.user2Id,
        unmatchedAt: matches.unmatchedAt,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "UNMATCHED"),
          sql`(${matches.user1Id} = ${currentUserId} OR ${matches.user2Id} = ${currentUserId})`
        )
      );

    const unmatchHistoryMap = new Map<string, Date | null>();
    for (const record of pastUnmatches) {
      const exPartnerId = record.user1Id === currentUserId ? record.user2Id : record.user1Id;
      const existingDate = unmatchHistoryMap.get(exPartnerId);
      if (!existingDate || (record.unmatchedAt && record.unmatchedAt > existingDate)) {
        unmatchHistoryMap.set(exPartnerId, record.unmatchedAt);
      }
    }

    // 4. Build query filters with gender preference
    const whereConditions = [
      eq(users.isLocked, false), // Exclude locked / matched users
      eq(users.isDeleted, false), // Exclude deleted accounts
      notInArray(users.id, Array.from(excludedUserIds)),
    ];

    if (myProfile?.interestedIn && myProfile.interestedIn !== "everyone") {
      whereConditions.push(eq(profiles.gender, myProfile.interestedIn));
    }

    // 5. Query available candidate users with pagination
    const candidates = await db
      .select({
        userId: users.id,
        isVerified: users.isVerified,
        username: profiles.username,
        actualName: profiles.actualName,
        gender: profiles.gender,
        dob: profiles.dob,
        bio: profiles.bio,
        interests: profiles.interests,
        lookingFor: profiles.lookingFor,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
        realPhotos: profiles.realPhotos,
        isPublicReveal: profiles.isPublicReveal,
      })
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    // 5. Sanitize profiles based on privacy / reveal settings and attach ex-match warnings
    return candidates.map((candidate) => {
      const isRevealed = candidate.isPublicReveal;
      const previouslyUnmatched = unmatchHistoryMap.has(candidate.userId);
      const lastUnmatchedAt = unmatchHistoryMap.get(candidate.userId) ?? null;

      return {
        userId: candidate.userId,
        isVerified: candidate.isVerified,
        username: candidate.username,
        avatarUrl: candidate.avatarUrl,
        gender: candidate.gender,
        dob: candidate.dob,
        bio: candidate.bio,
        interests: candidate.interests,
        lookingFor: candidate.lookingFor,
        city: candidate.city,
        isPublicReveal: candidate.isPublicReveal,
        actualName: isRevealed ? candidate.actualName : "[HIDDEN - Connect & Mutually Reveal]",
        realPhotos: isRevealed ? candidate.realPhotos : [],
        previouslyUnmatched,
        lastUnmatchedAt,
        warning: previouslyUnmatched
          ? "Warning: You have previously matched and unmatched with this user (they may have updated their username)."
          : null,
      };
    });
  }
}
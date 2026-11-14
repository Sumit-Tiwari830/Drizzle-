import { db } from "../../db/index.js";
import { users, profiles, requests } from "../../db/schema/index.js";
import { eq, and, ne, notInArray, sql } from "drizzle-orm";

export class DiscoveryService {
  /**
   * Get Candidate Feed for Discovery
   * Rules:
   * - Candidates locked in an active match (isLocked = true) are HIDDEN.
   * - Deleted users (isDeleted = true) are HIDDEN.
   * - Current user is excluded.
   * - Privacy: If candidate has isPublicReveal = false, actualName and realPhotos are hidden!
   */
  static async getFeed(currentUserId: string) {
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

    // 3. Query available candidate users
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
      .where(
        and(
          eq(users.isLocked, false), // Exclude locked / matched users
          eq(users.isDeleted, false), // Exclude deleted accounts
          notInArray(users.id, Array.from(excludedUserIds))
        )
      )
      .limit(30);

    // 4. Sanitize profiles based on privacy / reveal settings
    return candidates.map((candidate) => {
      const isRevealed = candidate.isPublicReveal;
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
      };
    });
  }
}

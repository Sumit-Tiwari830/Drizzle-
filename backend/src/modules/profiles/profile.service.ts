import { db } from "../../db/index.js";
import { profiles } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";

export class ProfileService {
  static async getMyProfile(userId: string) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    return profile;
  }

  /**
   * Update Username (Pseudonym)
   * Especially useful after unmatching, so the user can change their identity handle.
   */
  static async updateUsername(userId: string, newUsername: string) {
    const cleanUsername = newUsername.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new ApiError(400, "Username must be at least 3 characters long");
    }

    // Check if username is already taken by someone else
    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.username, cleanUsername))
      .limit(1);

    if (existing && existing.userId !== userId) {
      throw new ApiError(409, "Username already taken by another user");
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set({ username: cleanUsername, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();

    return updatedProfile;
  }

  /**
   * Toggle Public Profile Reveal
   * If true: User reveals their actual name and real photos to everyone publicly at any time.
   */
  static async togglePublicReveal(userId: string, isPublicReveal: boolean) {
    const [updatedProfile] = await db
      .update(profiles)
      .set({ isPublicReveal, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();

    return updatedProfile;
  }

  /**
   * Update general profile details
   */
  static async updateProfile(
    userId: string,
    data: {
      bio?: string;
      interests?: string[];
      city?: string;
      lookingFor?: string;
      interestedIn?: string;
      avatarUrl?: string;
      realPhotos?: string[];
    }
  ) {
    const [updatedProfile] = await db
      .update(profiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    return updatedProfile;
  }
}

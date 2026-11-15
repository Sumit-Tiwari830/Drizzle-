import { db } from "../../db/index.js";
import { profiles } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../../utils/apiError.js";
import { calculateAge } from "../../utils/date.js";
import { CloudinaryService } from "../../services/cloudinary.service.js";

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

    return {
      ...profile,
      age: calculateAge(profile.dob),
    };
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

    return {
      ...updatedProfile,
      age: calculateAge(updatedProfile.dob),
    };
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

    return {
      ...updatedProfile,
      age: calculateAge(updatedProfile.dob),
    };
  }

  /**
   * Toggle Region Visibility
   * If true: Region is shown to potential matches and feed viewers.
   * If false: Region is concealed in anonymous mode.
   */
  static async toggleRegionVisibility(userId: string, isRegionVisible: boolean) {
    const [updatedProfile] = await db
      .update(profiles)
      .set({ isRegionVisible, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();

    return {
      ...updatedProfile,
      age: calculateAge(updatedProfile.dob),
    };
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
      height?: string;
      region?: string;
      isRegionVisible?: boolean;
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

    return {
      ...updatedProfile,
      age: calculateAge(updatedProfile.dob),
    };
  }

  /**
   * Upload and update user avatar via Cloudinary
   */
  static async uploadAvatar(userId: string, buffer: Buffer) {
    const uploadResult = await CloudinaryService.uploadStream(buffer, "dating_app/avatars", [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ]);

    const [updatedProfile] = await db
      .update(profiles)
      .set({
        avatarUrl: uploadResult.secure_url,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    return {
      avatarUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      profile: {
        ...updatedProfile,
        age: calculateAge(updatedProfile.dob),
      },
    };
  }

  /**
   * Upload a real photo to user's gallery via Cloudinary (Max 6 photos)
   */
  static async uploadPhoto(userId: string, buffer: Buffer) {
    const [currentProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!currentProfile) {
      throw new ApiError(404, "Profile not found");
    }

    const currentPhotos = currentProfile.realPhotos || [];
    if (currentPhotos.length >= 6) {
      throw new ApiError(400, "Maximum of 6 photos allowed. Please delete a photo before uploading a new one.");
    }

    const uploadResult = await CloudinaryService.uploadStream(buffer, "dating_app/photos");
    const updatedPhotos = [...currentPhotos, uploadResult.secure_url];

    const [updatedProfile] = await db
      .update(profiles)
      .set({
        realPhotos: updatedPhotos,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    return {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      realPhotos: updatedPhotos,
      profile: {
        ...updatedProfile,
        age: calculateAge(updatedProfile.dob),
      },
    };
  }

  /**
   * Delete a photo from user's gallery and Cloudinary
   */
  static async deletePhoto(userId: string, photoUrl: string) {
    const [currentProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!currentProfile) {
      throw new ApiError(404, "Profile not found");
    }

    const currentPhotos = currentProfile.realPhotos || [];
    const updatedPhotos = currentPhotos.filter((url) => url !== photoUrl);

    if (updatedPhotos.length === currentPhotos.length) {
      throw new ApiError(404, "Photo URL not found in your gallery");
    }

    await db
      .update(profiles)
      .set({
        realPhotos: updatedPhotos,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    // Asynchronously delete from Cloudinary
    const publicId = CloudinaryService.extractPublicId(photoUrl);
    if (publicId) {
      CloudinaryService.deleteImage(publicId).catch(() => {});
    }

    return {
      message: "Photo deleted successfully",
      realPhotos: updatedPhotos,
    };
  }
}

import { Request, Response, NextFunction } from "express";
import { ProfileService } from "./profile.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class ProfileController {
  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await ProfileService.getMyProfile(userId);
      return sendResponse(res, 200, true, "Profile retrieved successfully", profile);
    } catch (error) {
      next(error);
    }
  }

  static async updateUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { username } = req.body;

      if (!username) {
        throw new ApiError(400, "Username is required");
      }

      const updated = await ProfileService.updateUsername(userId, username);
      return sendResponse(res, 200, true, "Username updated successfully", updated);
    } catch (error) {
      next(error);
    }
  }

  static async togglePublicReveal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { isPublicReveal } = req.body;

      if (typeof isPublicReveal !== "boolean") {
        throw new ApiError(400, "isPublicReveal must be a boolean");
      }

      const updated = await ProfileService.togglePublicReveal(userId, isPublicReveal);
      const message = isPublicReveal
        ? "Public profile reveal enabled. Your actual name and real photos are now visible to everyone."
        : "Public profile reveal disabled. You are now in anonymous mode.";

      return sendResponse(res, 200, true, message, updated);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { bio, interests, city, lookingFor, interestedIn, avatarUrl, realPhotos } = req.body;

      const updated = await ProfileService.updateProfile(userId, {
        bio,
        interests,
        city,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
      });

      return sendResponse(res, 200, true, "Profile updated successfully", updated);
    } catch (error) {
      next(error);
    }
  }
}

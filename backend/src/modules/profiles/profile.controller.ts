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

  static async toggleRegionVisibility(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { isRegionVisible } = req.body;

      if (typeof isRegionVisible !== "boolean") {
        throw new ApiError(400, "isRegionVisible must be a boolean");
      }

      const updated = await ProfileService.toggleRegionVisibility(userId, isRegionVisible);
      const message = isRegionVisible
        ? "Region visibility enabled. Your region is now visible on your profile."
        : "Region visibility disabled. Your region is now hidden from public view.";

      return sendResponse(res, 200, true, message, updated);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        username,
        actualName,
        gender,
        dob,
        bio,
        interests,
        city,
        height,
        region,
        isRegionVisible,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
        isPublicReveal,
      } = req.body;

      const updated = await ProfileService.updateProfile(userId, {
        username,
        actualName,
        gender,
        dob,
        bio,
        interests,
        city,
        height,
        region,
        isRegionVisible,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
        isPublicReveal,
      });

      return sendResponse(res, 200, true, "Profile updated successfully", updated);
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        throw new ApiError(400, "Please provide an image file with field name 'avatar'");
      }

      const result = await ProfileService.uploadAvatar(userId, file.buffer);
      return sendResponse(res, 200, true, "Avatar uploaded successfully to Cloudinary", result);
    } catch (error) {
      next(error);
    }
  }

  static async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        throw new ApiError(400, "Please provide an image file with field name 'photo'");
      }

      const result = await ProfileService.uploadPhoto(userId, file.buffer);
      return sendResponse(res, 200, true, "Photo uploaded successfully to Cloudinary", result);
    } catch (error) {
      next(error);
    }
  }

  static async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { photoUrl } = req.body;

      if (!photoUrl) {
        throw new ApiError(400, "photoUrl is required to delete a photo");
      }

      const result = await ProfileService.deletePhoto(userId, photoUrl);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }
}

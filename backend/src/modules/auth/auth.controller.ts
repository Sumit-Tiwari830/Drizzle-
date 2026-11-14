import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, username, actualName, gender, dob, bio, interests, city, lookingFor, interestedIn, avatarUrl, realPhotos, isPublicReveal } = req.body;

      if (!email || !password || !username || !dob) {
        throw new ApiError(400, "Email, password, username, and Date of Birth (dob) are required");
      }

      const result = await AuthService.register({
        email,
        password,
        username,
        actualName,
        gender,
        dob,
        bio,
        interests,
        city,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
        isPublicReveal,
      });

      return sendResponse(res, 201, true, "User registered successfully", result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      const result = await AuthService.login(email, password);
      return sendResponse(res, 200, true, "Login successful", result);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await AuthService.deleteAccount(userId);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }
}

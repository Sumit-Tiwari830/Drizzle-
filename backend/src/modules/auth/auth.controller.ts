import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        username,
        actualName,
        gender,
        dob,
        height,
        region,
        isRegionVisible,
        bio,
        interests,
        city,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
        isPublicReveal,
      } = req.body;

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
        height,
        region,
        isRegionVisible,
        bio,
        interests,
        city,
        lookingFor,
        interestedIn,
        avatarUrl,
        realPhotos,
        isPublicReveal,
      });

      return sendResponse(res, 201, true, result.message, result);
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

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        throw new ApiError(400, "Email and 6-digit OTP code are required");
      }

      const result = await AuthService.verifyEmail(email, otp);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, type } = req.body;

      if (!email) {
        throw new ApiError(400, "Email is required");
      }

      const result = await AuthService.resendOtp(email, type || "EMAIL_VERIFICATION");
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, "Email is required");
      }

      const result = await AuthService.forgotPassword(email);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP code, and newPassword are required");
      }

      const result = await AuthService.resetPassword(email, otp, newPassword);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getMe(userId);
      return sendResponse(res, 200, true, "User profile retrieved successfully", user);
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

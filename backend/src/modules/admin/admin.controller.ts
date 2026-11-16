import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class AdminController {
  static async uploadMasterSheet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        throw new ApiError(400, "Please provide an Excel file (.xlsx, .xls, .csv)");
      }

      const result = await AdminService.uploadMasterSheet(req.file.buffer);
      return sendResponse(res, 200, true, "Master directory updated successfully", result);
    } catch (error) {
      next(error);
    }
  }

  static async getUnverifiedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const usersList = await AdminService.getUnverifiedUsers();
      return sendResponse(res, 200, true, "Unverified users retrieved", usersList);
    } catch (error) {
      next(error);
    }
  }

  static async verifyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await AdminService.verifyUser(id);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async unverifyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await AdminService.unverifyUser(id);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = (req.query.search as string) || undefined;
      const filter = (req.query.filter as string) || undefined;
      const list = await AdminService.getAllUsers(search, filter);
      return sendResponse(res, 200, true, "All users retrieved successfully", list);
    } catch (error) {
      next(error);
    }
  }

  static async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id as string;
      const adminUserId = req.user!.id;
      const result = await AdminService.blockUser(targetUserId, adminUserId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id as string;
      const result = await AdminService.unblockUser(targetUserId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async promoteToAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id as string;
      const requesterUserId = req.user!.id;
      const result = await AdminService.promoteToAdmin(targetUserId, requesterUserId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async demoteFromAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id as string;
      const requesterUserId = req.user!.id;
      const result = await AdminService.demoteFromAdmin(targetUserId, requesterUserId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async removeUser(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id as string;
      const adminUserId = req.user!.id;
      const result = await AdminService.removeUser(targetUserId, adminUserId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }
}

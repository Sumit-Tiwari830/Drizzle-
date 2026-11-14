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
      const { id } = req.params;
      const result = await AdminService.verifyUser(id);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }
}

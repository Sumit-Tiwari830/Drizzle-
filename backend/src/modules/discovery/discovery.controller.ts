import { Request, Response, NextFunction } from "express";
import { DiscoveryService } from "./discovery.service.js";
import { sendResponse } from "../../utils/apiResponse.js";

export class DiscoveryController {
  static async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const feed = await DiscoveryService.getFeed(userId, page, limit);
      return sendResponse(res, 200, true, "Discovery feed retrieved successfully", feed);
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from "express";
import { DiscoveryService } from "./discovery.service.js";
import { sendResponse } from "../../utils/apiResponse.js";

export class DiscoveryController {
  static async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const feed = await DiscoveryService.getFeed(userId);
      return sendResponse(res, 200, true, "Discovery feed retrieved successfully", feed);
    } catch (error) {
      next(error);
    }
  }
}

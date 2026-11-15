import { Request, Response, NextFunction } from "express";
import { RequestService } from "./request.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class RequestController {
  static async sendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.id;
      const { receiverId } = req.body;

      if (!receiverId) {
        throw new ApiError(400, "receiverId is required");
      }

      const result = await RequestService.sendRequest(senderId, receiverId);
      return sendResponse(res, 201, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async respondToRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const receiverId = req.user!.id;
      const id = req.params.id as string;
      const { action } = req.body;

      if (!action || !["ACCEPT", "REJECT"].includes(action)) {
        throw new ApiError(400, "Action must be either 'ACCEPT' or 'REJECT'");
      }

      const result = await RequestService.respondToRequest(id, receiverId, action);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async getMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const requestsData = await RequestService.getMyRequests(userId);
      return sendResponse(res, 200, true, "Requests retrieved successfully", requestsData);
    } catch (error) {
      next(error);
    }
  }
}

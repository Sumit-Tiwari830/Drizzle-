import { Request, Response, NextFunction } from "express";
import { MatchService } from "./match.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

export class MatchController {
  static async getMyMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const match = await MatchService.getMyMatch(userId);
      return sendResponse(res, 200, true, match ? "Active match retrieved" : "No active match", match);
    } catch (error) {
      next(error);
    }
  }

  static async requestProfileReveal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const result = await MatchService.requestProfileReveal(id, userId);
      return sendResponse(res, 200, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async unmatch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const io = req.app.get("io");

      const result = await MatchService.unmatch(id, userId, io);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }
}

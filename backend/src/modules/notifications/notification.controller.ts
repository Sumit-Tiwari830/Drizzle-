import { Request, Response, NextFunction } from "express";
import { NotificationService } from "./notification.service.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { PushService } from "../../services/push.service.js";
import { ApiError } from "../../utils/apiError.js";

export class NotificationController {
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const inbox = await NotificationService.getUserNotifications(userId, page, limit);
      return sendResponse(res, 200, true, "Notification inbox retrieved", inbox);
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const unreadCount = await NotificationService.getUnreadCount(userId);
      return sendResponse(res, 200, true, "Unread count retrieved", { unreadCount });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const updated = await NotificationService.markAsRead(id, userId);
      return sendResponse(res, 200, true, "Notification marked as read", updated);
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await NotificationService.markAllAsRead(userId);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const result = await NotificationService.deleteNotification(id, userId);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { token, platform } = req.body;

      if (!token) {
        throw new ApiError(400, "Device push token is required");
      }

      const device = await PushService.registerDevice(userId, token, platform || "android");
      return sendResponse(res, 200, true, "Device push token registered successfully", device);
    } catch (error) {
      next(error);
    }
  }

  static async removeDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      if (!token) {
        throw new ApiError(400, "Device push token is required");
      }

      const result = await PushService.removeDevice(userId, token);
      return sendResponse(res, 200, true, result.message);
    } catch (error) {
      next(error);
    }
  }
}

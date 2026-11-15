import { Server } from "socket.io";
import { Notification, INotification } from "../../db/notification_schema.js";
import { ApiError } from "../../utils/apiError.js";
import { PushService } from "../../services/push.service.js";

export class NotificationService {
  /**
   * Create and deliver a notification
   * Saves to MongoDB, broadcasts real-time via Socket.IO, and dispatches Mobile Push Notification
   */
  static async createNotification(
    userId: string,
    type: "UNMATCHED" | "MATCHED" | "REQUEST_RECEIVED" | "PROFILE_REVEAL" | "SYSTEM",
    title: string,
    message: string,
    metadata: Record<string, any> = {},
    io?: Server
  ): Promise<INotification> {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      metadata,
      isRead: false,
    });

    // 1. Real-time delivery to user's socket room if connected
    if (io) {
      io.to(`user_${userId}`).emit("new_notification", notification);
    }

    // 2. Mobile/Web Push Notification dispatch
    PushService.sendPushNotification(userId, {
      title,
      body: message,
      data: { ...metadata, type, notificationId: notification._id?.toString() },
    }).catch((err) => console.warn("[NotificationService] Push dispatch notice:", err));

    return notification;
  }

  /**
   * Get user's notification box (Inbox) with pagination
   */
  static async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get total unread notifications count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return { message: "All notifications marked as read" };
  }

  /**
   * Delete a notification from the inbox
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const result = await Notification.findOneAndDelete({ _id: notificationId, userId });
    if (!result) {
      throw new ApiError(404, "Notification not found");
    }
    return { message: "Notification deleted successfully" };
  }
}

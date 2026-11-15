import { Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { db } from "../../db/index.js";
import { matches } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { Message } from "../../db/msg_schema.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";
import { PushService } from "../../services/push.service.js";

export class ChatController {
  static getStatus(req: Request, res: Response) {
    return sendResponse(res, 200, true, "Chat API service is operational");
  }

  /**
   * Get Message History (MongoDB)
   * Only allowed if sender and receiver are actively matched in PostgreSQL.
   */
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const matchId = req.params.matchId as string;

      if (!matchId) {
        throw new ApiError(400, "matchId parameter is required to retrieve chat history");
      }

      // 1. Verify Active Match Authorization in PostgreSQL
      const [match] = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            eq(matches.status, "ACTIVE"),
            or(eq(matches.user1Id, currentUserId), eq(matches.user2Id, currentUserId))
          )
        )
        .limit(1);

      if (!match) {
        throw new ApiError(
          403,
          "Forbidden: You can only view chat history for an active match you are a part of."
        );
      }

      // 2. Query MongoDB for 30-day message history
      const messageHistory = await Message.find({ matchId })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      return sendResponse(res, 200, true, "Chat message history retrieved", messageHistory);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Message (REST API)
   * Strict Access Control:
   * Only allows sending messages if the candidates are actively matched in PostgreSQL.
   */
  static async createMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.id;
      const { matchId, message } = req.body;

      if (!matchId || !message) {
        throw new ApiError(400, "matchId and message content are required");
      }

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        throw new ApiError(400, "Message content cannot be empty");
      }

      // 1. Verify Active Match Authorization in PostgreSQL
      const [match] = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            eq(matches.status, "ACTIVE"),
            or(eq(matches.user1Id, senderId), eq(matches.user2Id, senderId))
          )
        )
        .limit(1);

      if (!match) {
        throw new ApiError(
          403,
          "Forbidden: You can only send messages to users with whom you have an active match."
        );
      }

      // Determine the partner (receiver)
      const receiverId = match.user1Id === senderId ? match.user2Id : match.user1Id;

      // 2. Persist message to MongoDB (with 30-day auto TTL)
      const savedMessage = await Message.create({
        matchId,
        senderId,
        receiverId,
        message: trimmedMessage,
      });

      // 3. Real-time broadcast to the match's private WebSocket room
      const io: Server | undefined = req.app.get("io");
      if (io) {
        io.to(`match_${matchId}`).emit("chat_message", savedMessage);
      }

      // 4. Dispatch mobile push notification to partner
      PushService.sendPushNotification(receiverId, {
        title: "New Message",
        body: trimmedMessage.length > 60 ? `${trimmedMessage.substring(0, 57)}...` : trimmedMessage,
        data: { matchId, type: "CHAT_MESSAGE", senderId },
      }).catch(() => {});

      return sendResponse(res, 201, true, "Message sent successfully", savedMessage);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all unread messages in a match as READ
   * REST endpoint complementary to the Socket.IO mark_read event.
   */
  static async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const matchId = req.params.matchId as string;

      if (!matchId) {
        throw new ApiError(400, "matchId parameter is required");
      }

      // 1. Verify Active Match Authorization in PostgreSQL
      const [match] = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            eq(matches.status, "ACTIVE"),
            or(eq(matches.user1Id, currentUserId), eq(matches.user2Id, currentUserId))
          )
        )
        .limit(1);

      if (!match) {
        throw new ApiError(
          403,
          "Forbidden: You can only mark messages as read for an active match you are a part of."
        );
      }

      // 2. Update unread messages where current user is receiver
      const readAt = new Date();
      const updateResult = await Message.updateMany(
        { matchId, receiverId: currentUserId, isRead: false },
        { $set: { isRead: true, readAt } }
      );

      // 3. Broadcast read receipt via Socket.IO
      const io: Server | undefined = req.app.get("io");
      if (io && updateResult.modifiedCount > 0) {
        io.to(`match_${matchId}`).emit("messages_read", {
          matchId,
          readerId: currentUserId,
          readAt,
          count: updateResult.modifiedCount,
        });
      }

      return sendResponse(res, 200, true, "Messages marked as read", {
        matchId,
        markedReadCount: updateResult.modifiedCount,
        readAt,
      });
    } catch (error) {
      next(error);
    }
  }
}

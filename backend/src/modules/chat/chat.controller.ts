import { Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { db } from "../../db/index.js";
import { matches } from "../../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { Message } from "../../db/msg_schema.js";
import { sendResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/apiError.js";

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

      return sendResponse(res, 201, true, "Message sent successfully", savedMessage);
    } catch (error) {
      next(error);
    }
  }
}

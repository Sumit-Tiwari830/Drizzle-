import { Server, Socket } from "socket.io";
import { Message } from "../db/msg_schema.js";
import { db } from "../db/index.js";
import { matches } from "../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";
import { PushService } from "../services/push.service.js";

export const setupSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // Join personal user notification room
    socket.on("join_user", (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`🔔 Socket ${socket.id} joined personal notification room: user_${userId}`);
      }
    });

    // Join room for an active match with verification
    socket.on("join_match", async (data: { matchId: string; userId: string }) => {
      try {
        const { matchId, userId } = data;

        if (!matchId || !userId) {
          socket.emit("error", { message: "matchId and userId are required to join match room" });
          return;
        }

        // Verify that the user is an active participant in this match
        const [match] = await db
          .select()
          .from(matches)
          .where(
            and(
              eq(matches.id, matchId),
              eq(matches.status, "ACTIVE"),
              or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
            )
          )
          .limit(1);

        if (!match) {
          socket.emit("error", { message: "Unauthorized: You are not part of an active match for this room" });
          return;
        }

        socket.join(`match_${matchId}`);
        console.log(`👥 Socket ${socket.id} (User: ${userId}) joined room: match_${matchId}`);
      } catch (error) {
        console.error("Error joining match room:", error);
        socket.emit("error", { message: "Failed to join match room" });
      }
    });

    // 1. Real-time Chat Messaging with Match Verification
    socket.on(
      "chat_message",
      async (data: { matchId: string; senderId: string; message: string }) => {
        try {
          const { matchId, senderId, message } = data;

          if (!matchId || !senderId || !message || !message.trim()) {
            socket.emit("error", { message: "matchId, senderId, and non-empty message are required" });
            return;
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
            socket.emit("error", {
              message: "Forbidden: You can only send messages to users with whom you have an active match.",
            });
            return;
          }

          const receiverId = match.user1Id === senderId ? match.user2Id : match.user1Id;

          // 2. Persist to MongoDB (with 30-day auto TTL & Read receipt flags)
          const savedMessage = await Message.create({
            matchId,
            senderId,
            receiverId,
            message: message.trim(),
            isRead: false,
            readAt: null,
          });

          // 3. Broadcast to the private match room
          io.to(`match_${matchId}`).emit("chat_message", savedMessage);

          // 4. Mobile push notification to receiver
          PushService.sendPushNotification(receiverId, {
            title: "New Message",
            body: message.trim().length > 60 ? `${message.trim().substring(0, 57)}...` : message.trim(),
            data: { matchId, type: "CHAT_MESSAGE", senderId },
          }).catch(() => {});
        } catch (error) {
          console.error("❌ Error handling socket chat_message:", error);
          socket.emit("error", { message: "Failed to process chat message" });
        }
      }
    );

    // 2. Real-time Typing Indicators
    socket.on("typing_start", (data: { matchId: string; userId: string }) => {
      if (data?.matchId && data?.userId) {
        // Broadcast to other participant in the match room
        socket.to(`match_${data.matchId}`).emit("partner_typing", {
          matchId: data.matchId,
          userId: data.userId,
          isTyping: true,
        });
      }
    });

    socket.on("typing_stop", (data: { matchId: string; userId: string }) => {
      if (data?.matchId && data?.userId) {
        socket.to(`match_${data.matchId}`).emit("partner_typing", {
          matchId: data.matchId,
          userId: data.userId,
          isTyping: false,
        });
      }
    });

    // 3. Real-time Read Receipts
    socket.on("mark_read", async (data: { matchId: string; userId: string }) => {
      try {
        const { matchId, userId } = data;
        if (!matchId || !userId) return;

        const readAt = new Date();
        const updateResult = await Message.updateMany(
          { matchId, receiverId: userId, isRead: false },
          { $set: { isRead: true, readAt } }
        );

        if (updateResult.modifiedCount > 0) {
          io.to(`match_${matchId}`).emit("messages_read", {
            matchId,
            readerId: userId,
            readAt,
            count: updateResult.modifiedCount,
          });
        }
      } catch (error) {
        console.error("❌ Error processing socket mark_read:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
};

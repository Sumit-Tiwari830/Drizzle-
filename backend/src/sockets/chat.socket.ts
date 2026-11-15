import { Server, Socket } from "socket.io";
import { Message } from "../db/msg_schema.js";
import { db } from "../db/index.js";
import { matches } from "../db/schema/index.js";
import { eq, and, or } from "drizzle-orm";

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

    // Real-time Chat Messaging with Match Verification
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

          // 2. Persist to MongoDB (with 30-day auto TTL)
          const savedMessage = await Message.create({
            matchId,
            senderId,
            receiverId,
            message: message.trim(),
          });

          // 3. Broadcast to the private match room
          io.to(`match_${matchId}`).emit("chat_message", savedMessage);
        } catch (error) {
          console.error("❌ Error handling socket chat_message:", error);
          socket.emit("error", { message: "Failed to process chat message" });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
};

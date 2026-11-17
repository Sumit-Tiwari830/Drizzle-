import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import { ChatMessage } from "../types";

const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }
  return "http://localhost:5000";
};

class SocketService {
  private socket: Socket | null = null;
  private currentMatchId: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("⚡ [SocketService] Connected to real-time server with socket ID:", this.socket?.id);
      if (this.currentMatchId) {
        this.joinMatch(this.currentMatchId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 [SocketService] Disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.warn("⚠️ [SocketService] Connection error:", error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentMatchId = null;
    }
  }

  joinMatch(matchId: string) {
    this.currentMatchId = matchId;
    if (this.socket?.connected) {
      this.socket.emit("join_match", matchId);
    }
  }

  joinUserRoom(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit("join_user", userId);
    }
  }

  leaveMatch(matchId: string) {
    if (this.socket?.connected) {
      this.socket.emit("leave_match", matchId);
    }
    this.currentMatchId = null;
  }

  sendMessage(matchId: string, receiverId: string, message: string) {
    if (this.socket?.connected) {
      this.socket.emit("send_message", { matchId, receiverId, message });
    }
  }

  startTyping(matchId: string) {
    if (this.socket?.connected) {
      this.socket.emit("typing_start", { matchId });
    }
  }

  stopTyping(matchId: string) {
    if (this.socket?.connected) {
      this.socket.emit("typing_stop", { matchId });
    }
  }

  markAsRead(matchId: string) {
    if (this.socket?.connected) {
      this.socket.emit("mark_read", { matchId });
    }
  }

  // Event Listeners
  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on("new_message", callback);
  }

  onPartnerTyping(callback: (data: { isTyping: boolean }) => void) {
    this.socket?.on("partner_typing", callback);
  }

  onMessagesRead(callback: (data: { matchId: string; readAt: string }) => void) {
    this.socket?.on("messages_read", callback);
  }

  onMatchEnded(callback: (data: { matchId: string; reason: string }) => void) {
    this.socket?.on("match_ended", callback);
  }

  onNewNotification(callback: (notification: any) => void) {
    this.socket?.on("new_notification", callback);
  }

  removeListeners() {
    this.socket?.off("new_message");
    this.socket?.off("partner_typing");
    this.socket?.off("messages_read");
    this.socket?.off("match_ended");
    this.socket?.off("new_notification");
  }
}

export const socketService = new SocketService();

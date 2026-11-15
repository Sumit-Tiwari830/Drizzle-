import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setupSockets } from "./chat.socket.js";

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Attach socket event listeners
  setupSockets(io);

  return io;
};

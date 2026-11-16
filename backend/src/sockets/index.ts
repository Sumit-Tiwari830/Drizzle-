import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setupSockets } from "./chat.socket.js";

let ioInstance: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  const clientUrl = process.env.CLIENT_URL || "*";
  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl === "*" ? true : clientUrl.includes(",") ? clientUrl.split(",") : clientUrl,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Attach socket event listeners
  setupSockets(io);
  ioInstance = io;

  return io;
};

export const getIO = (): Server | null => ioInstance;


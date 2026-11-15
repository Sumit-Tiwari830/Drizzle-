import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { initSocketServer } from "./sockets/index.js";
import { connectMongo } from "./db/mongo.js";
import { pool } from "./db/index.js";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// 1. Initialize WebSockets on the same unified HTTP server
const io = initSocketServer(server);

// 2. Attach io instance to Express app for use in REST controllers
app.set("io", io);

async function startServer() {
  try {
    // 3. Connect to MongoDB (for real-time chat message storage)
    await connectMongo();

    // 4. Start the unified HTTP & WebSocket server
    server.listen(PORT, () => {
      console.log(`🚀 Unified Dating App Backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
      console.log(`   📡 REST API (PostgreSQL + MongoDB): http://localhost:${PORT}/api/v1`);
      console.log(`   💬 WebSocket Server (Socket.IO):    ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start unified server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log("🔒 PostgreSQL connection pool closed.");
      await mongoose.connection.close();
      console.log("🔒 MongoDB connection closed.");
    } catch (err) {
      console.error("Error during database shutdown:", err);
    }
    console.log("Server gracefully terminated.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

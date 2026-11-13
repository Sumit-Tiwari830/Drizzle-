import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config'; 

// Import your organized modules
import connectDB from './index.js';
import { setupSockets } from './sockets/chat.socket.js';
import { setupChatRoutes } from './modules/chat.routes.js';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Initialize MongoDB connection
connectDB();

// Attach REST API routes
app.use('/api', setupChatRoutes(io));

// Attach WebSocket connection handlers
setupSockets(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Combined API & Chat server running on port ${PORT}`);
});
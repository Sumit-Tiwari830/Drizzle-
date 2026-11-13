import { Server, Socket } from 'socket.io';

export const setupSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('chat_message', (data) => {
      console.log(`💬 WebSocket message from ${socket.id}:`, data);
      socket.broadcast.emit('chat_message', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });
};
import { Router } from 'express';
import { Server } from 'socket.io';
import { getStatus, createMessage } from './chat.controller.js';

export const setupChatRoutes = (io: Server) => {
  const router = Router();

  router.get('/status', getStatus);
  router.post('/messages', createMessage(io));

  return router;
};
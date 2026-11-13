import { type Request, type Response } from 'express';
import { Server } from 'socket.io';
import { Message } from '../db/msg_schema.js';

export const getStatus = (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'API Service is running' });
};

export const createMessage = (io: Server) => async (req: Request, res: Response) => {
  try {
    const { user, message } = req.body;

    if (!user || !message) {
      res.status(400).json({ error: 'User and message are required' });
      return;
    }

    // 1. Save the incoming data to MongoDB
    const savedMessage = await Message.create({ user, message });

    // 2. Broadcast the message via Socket.IO to connected clients
    io.emit('chat_message', savedMessage);

    res.status(201).json({ success: true, data: savedMessage });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
};
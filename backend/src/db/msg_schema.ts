import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  matchId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  matchId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
    index: true,
  },
  receiverId: {
    type: String,
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 1. Fast pagination index for match conversations
MessageSchema.index({ matchId: 1, createdAt: 1 });

// 2. 30-Day TTL Index: automatically deletes documents after 30 days (30 * 24 * 60 * 60 seconds)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

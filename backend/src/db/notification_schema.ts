import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: string;
  type: "UNMATCHED" | "MATCHED" | "REQUEST_RECEIVED" | "PROFILE_REVEAL" | "SYSTEM" | "VERIFIED" | "ACCOUNT_STATUS";
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["UNMATCHED", "MATCHED", "REQUEST_RECEIVED", "PROFILE_REVEAL", "SYSTEM", "VERIFIED", "ACCOUNT_STATUS"],
    default: "SYSTEM",
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Fast query index for user's notification box
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

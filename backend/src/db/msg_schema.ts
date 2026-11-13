import mongoose, { Schema, Document } from 'mongoose';

// Define the TypeScript interface for the document
export interface IMessage extends Document {
  user: string;
  message: string;
  createdAt: Date;
}

// Create the Mongoose schema
const MessageSchema: Schema = new Schema({
  user: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Export the Mongoose model
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
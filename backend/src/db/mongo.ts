import mongoose from "mongoose";

export const connectMongo = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/dating_chat";
    await mongoose.connect(mongoURI);
    console.log("🍃 MongoDB connected successfully (Chat Database)");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Don't crash entire server if MongoDB is temporarily down in local dev, but log error
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
};

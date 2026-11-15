import mongoose from "mongoose";

export const connectMongo = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/dating_chat";

    // Optimized connection pooling for high-concurrency (up to 2,000+ active connections)
    await mongoose.connect(mongoURI, {
      maxPoolSize: 100, // Handle up to 100 concurrent Mongo socket operations
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("🍃 MongoDB connected successfully (High-Concurrency Connection Pool Ready)");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
};

import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt.js";
import { db } from "../db/index.js";
import { users, User } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError.js";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication token missing or invalid");
    }

    const token = authHeader.split(" ")[1];
    const decoded: JwtPayload = verifyToken(token);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, decoded.id), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      throw new ApiError(401, "User not found or account deactivated");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new ApiError(403, "Access denied: Admin privileges required"));
  }
  next();
};

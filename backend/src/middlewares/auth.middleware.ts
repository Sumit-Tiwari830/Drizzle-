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

/**
 * Verifies JWT token and attaches authenticated user to Request
 */
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

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Enforces that the authenticated user possesses one of the allowed roles.
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied: Required role (${roles.join(" or ")}). Current role: ${req.user.role}`
        )
      );
    }
    next();
  };
};

/**
 * Shortcut helper for Admin-only routes
 */
export const requireAdmin = authorizeRoles("ADMIN");

/**
 * Middleware ensuring user has verified their email address via OTP.
 */
export const requireEmailVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }
  if (!req.user.isEmailVerified) {
    return next(new ApiError(403, "Email address not verified. Please verify your email with OTP first."));
  }
  next();
};

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

export const MASTER_ADMIN_EMAIL = "kiransumit2231@gmail.com";

export const isMasterAdmin = (user?: User): boolean => {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
};

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
    if (!token || token === "undefined" || token === "null") {
      throw new ApiError(401, "Authentication token missing or invalid");
    }

    let decoded: JwtPayload;
    try {
      decoded = verifyToken(token);
    } catch (jwtError: any) {
      throw new ApiError(401, "Invalid or expired authentication token");
    }

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
    if (isMasterAdmin(req.user)) {
      return next(); // Master Admin possesses all role authorities
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
 * Shortcut helper for Admin-only routes (allows ADMIN, MASTER_ADMIN, and kiransumit2231@gmail.com)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }
  if (req.user.role === "ADMIN" || req.user.role === "MASTER_ADMIN" || isMasterAdmin(req.user)) {
    return next();
  }
  return next(new ApiError(403, "Access denied: Administrator privileges required."));
};

/**
 * Strictly Master Admin exclusive routes (Only kiransumit2231@gmail.com can manage administrators)
 */
export const requireMasterAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required"));
  }
  if (!isMasterAdmin(req.user)) {
    return next(
      new ApiError(
        403,
        `Access denied: Only Master Admin (${MASTER_ADMIN_EMAIL}) has authority to create or remove administrators.`
      )
    );
  }
  next();
};

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

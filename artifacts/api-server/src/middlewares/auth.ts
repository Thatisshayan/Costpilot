import { Request, Response, NextFunction } from "express";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";

// Extend Express Request interface to include userId and auth
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      auth?: any;
    }
  }
}

/**
 * Clerk Authentication Middleware
 * Populates req.userId from the verified session.
 * Supports a development fallback via 'x-user-id' header.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Use Clerk's middleware to populate req.auth
  return ClerkExpressWithAuth()(req, res, (err?: any) => {
    if (err) {
      return next(err);
    }

    // req.auth is populated by ClerkExpressWithAuth
    const userId = (req as any).auth?.userId;
    
    if (userId) {
      req.userId = userId;
      return next();
    }

    // Development-only bypass via header (never enabled in production)
    if (process.env.NODE_ENV !== "production") {
      const simulatedUserId = req.headers["x-user-id"] as string;
      if (simulatedUserId) {
        req.userId = simulatedUserId;
        return next();
      }
    }

    return res.status(401).json({ error: "Unauthorized" });
  });
};

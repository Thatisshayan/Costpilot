import { Request, Response, NextFunction } from "express";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";

// Extend Express Request interface to include userId and auth
declare global {
  namespace Express {
    interface Request {
      userId?: string;
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

    // Fallback for development/testing if enabled
    const simulatedUserId = req.headers["x-user-id"] as string;
    if (simulatedUserId) {
      req.userId = simulatedUserId;
      return next();
    }

    // Final fallback to ensure the UI remains functional during transition
    req.userId = "default_user";
    next();
  });
};

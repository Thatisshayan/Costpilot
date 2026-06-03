import { Request, Response, NextFunction } from "express";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import { db, workspaceMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

// Extend Express Request interface to include userId, auth, and workspaceRole
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      auth?: any;
      workspaceRole?: string;
    }
  }
}

/**
 * Clerk Authentication Middleware
 * Populates req.userId from the verified session.
 * Supports a development fallback via 'x-user-id' header.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Bypass Clerk auth for external webhooks (e.g. Stripe, provider telemetry)
  if (req.originalUrl.includes("/webhooks/stripe") || req.originalUrl.includes("/webhooks/incoming")) {
    return next();
  }

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

/**
 * Verifies if a user is a member of the workspace with optional role restriction.
 */
export async function isWorkspaceMember(
  workspaceId: number,
  userId: string,
  roles?: ("owner" | "admin" | "viewer")[]
): Promise<boolean> {
  try {
    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, userId)
        )
      );

    if (!member) return false;
    if (roles && !roles.includes(member.role as any)) return false;
    return true;
  } catch (error) {
    return false;
  }
}


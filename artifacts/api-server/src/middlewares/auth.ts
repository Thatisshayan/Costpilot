import { Request, Response, NextFunction } from "express";
import { verifyToken as clerkVerifyToken } from "@clerk/clerk-sdk-node";
import { db, workspaceMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

// Exported configuration object to facilitate robust unit testing/mocking across package boundaries
export const authConfig = {
  verifyToken: clerkVerifyToken,
};

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
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Bypass Clerk auth for external webhooks (e.g. Stripe, provider telemetry)
  if (req.originalUrl.includes("/webhooks/stripe") || req.originalUrl.includes("/webhooks/incoming")) {
    return next();
  }

  // Development-only bypass via header (strictly disabled in production)
  if (process.env.NODE_ENV !== "production") {
    const simulatedUserId = req.headers["x-user-id"] as string;
    if (simulatedUserId) {
      req.userId = simulatedUserId;
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized", message: "Authentication token missing" });
  }

  try {
    const decoded = await authConfig.verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    if (decoded && decoded.sub) {
      req.userId = decoded.sub;
      req.auth = decoded;
      return next();
    }
  } catch (error: any) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
      details: error instanceof Error ? error.message : String(error)
    });
  }

  return res.status(401).json({ error: "Unauthorized", message: "Authentication failed" });
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


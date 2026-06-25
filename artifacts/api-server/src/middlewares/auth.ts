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
      workspaceId?: number;
    }
  }
}

/**
 * Clerk Authentication Middleware
 * Populates req.userId from the verified session.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Bypass Clerk auth for external webhooks (e.g. Stripe, provider telemetry)
  if (req.originalUrl.includes("/webhooks/stripe") || req.originalUrl.includes("/webhooks/incoming")) {
    return next();
  }

  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

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
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
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


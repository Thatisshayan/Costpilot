import { Request, Response, NextFunction } from "express";
import { db, workspaceMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type WorkSpaceRole = "owner" | "admin" | "viewer";

/**
 * Single, canonical workspace-membership lookup shared by the middleware,
 * route guards, and service layer. Returns the member row or undefined.
 * Callers must not re-implement this query (see auth.ts isWorkspaceMember).
 */
export async function getWorkspaceMember(
  workspaceId: number,
  userId: string
): Promise<{ role: string; workspaceId: number; userId: string } | undefined> {
  const [member] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId)
      )
    );
  return member;
}

/**
 * Authorization middleware to verify if a user has access to a workspace.
 * Resolves the workspaceId from req.params, req.body, or req.query.
 */
export const requireWorkspaceMember = (roleRequirement?: WorkSpaceRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.userId;
    
    // Resolve workspace ID from various sources
    const rawWorkspaceId = req.params.workspaceId || req.params.id || req.body?.workspaceId || req.query?.workspaceId;
    const workspaceId = parseInt(rawWorkspaceId as string);

    if (!userId || isNaN(workspaceId)) {
      res.status(400).json({ error: "Invalid workspace context or session" });
      return;
    }

    try {
      const member = await getWorkspaceMember(workspaceId, userId);

      if (!member) {
        res.status(403).json({ error: "Forbidden: You are not a member of this workspace" });
        return;
      }

      if (roleRequirement && !roleRequirement.includes(member.role as WorkSpaceRole)) {
        res.status(403).json({ error: "Forbidden: Insufficient workspace role" });
        return;
      }

      // Attach role to the request object
      req.workspaceRole = member.role;
      next();
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to verify workspace membership" });
    }
  };
};

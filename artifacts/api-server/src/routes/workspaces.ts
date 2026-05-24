import { Router } from "express";
import {
  db,
  workspacesTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// List Workspaces
router.get("/", async (req, res) => {
  const userId = req.userId!;
  
  // Get workspaces where user is a member
  const workspaces = await db
    .select({
      id: workspacesTable.id,
      name: workspacesTable.name,
      slug: workspacesTable.slug,
      ownerId: workspacesTable.ownerId,
      createdAt: workspacesTable.createdAt,
    })
    .from(workspacesTable)
    .innerJoin(workspaceMembersTable, eq(workspacesTable.id, workspaceMembersTable.workspaceId))
    .where(eq(workspaceMembersTable.userId, userId));

  res.json(workspaces);
});

// Create Workspace
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { name, slug } = req.body;

  const [workspace] = await db
    .insert(workspacesTable)
    .values({
      name,
      slug,
      ownerId: userId,
    })
    .returning();

  // Add creator as owner
  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
    email: req.userEmail || "unknown@example.com", // Assuming Clerk provides email
  });

  res.status(201).json(workspace);
});

// List Members
router.get("/:id/members", async (req, res) => {
  const workspaceId = parseInt(req.params.id);
  
  const members = await db
    .select()
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

  res.json(members);
});

// Invite Member
router.post("/:id/invite", async (req, res) => {
  const workspaceId = parseInt(req.params.id);
  const { email, role } = req.body;

  // In a real app, we'd send an email invite.
  // For now, we'll just add the member directly if they exist or as a placeholder.
  const [member] = await db
    .insert(workspaceMembersTable)
    .values({
      workspaceId,
      userId: "invited-user", // Placeholder
      email,
      role,
    })
    .returning();

  res.status(201).json(member);
});

export default router;

import { Router } from "express";
import {
  db,
  workspacesTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireWorkspaceMember } from "../middlewares/authz";
import { CreateWorkspaceBody, UpdateWorkspaceBody, InviteToWorkspaceBody } from "@workspace/api-zod";

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
  const { name, slug } = CreateWorkspaceBody.parse(req.body);

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
    email: (req as any).userEmail || "unknown@example.com", // Assuming Clerk provides email
  });

  res.status(201).json(workspace);
});

// List Members
router.get("/:id/members", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  
  const members = await db
    .select()
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

  res.json(members);
});

// Invite Member
router.post("/:id/invite", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  const { email, role } = InviteToWorkspaceBody.parse(req.body);

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

// Update Workspace
router.patch("/:id", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  const { name, slug, onboarded } = UpdateWorkspaceBody.parse(req.body);

  // Build the update object dynamically
  const updateValues: Record<string, any> = {};
  if (name !== undefined) updateValues.name = name;
  if (slug !== undefined) updateValues.slug = slug;
  if (onboarded !== undefined) updateValues.onboarded = onboarded;

  if (Object.keys(updateValues).length === 0) {
    res.status(400).json({ error: "Bad Request: no fields to update provided" });
    return;
  }

  const [updatedWorkspace] = await db
    .update(workspacesTable)
    .set(updateValues)
    .where(eq(workspacesTable.id, workspaceId))
    .returning();

  if (!updatedWorkspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  res.json(updatedWorkspace);
});

export default router;

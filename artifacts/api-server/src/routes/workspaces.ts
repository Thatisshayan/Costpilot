import { Router } from "express";
import {
  db,
  workspacesTable,
  workspaceMembersTable,
  workspaceInvitesTable,
} from "@workspace/db";
import { eq, and, or, count } from "drizzle-orm";
import crypto from "crypto";
import { requireWorkspaceMember } from "../middlewares/authz";
import { CreateWorkspaceBody, UpdateWorkspaceBody, InviteToWorkspaceBody } from "@workspace/api-zod";

const router = Router();

// List Workspaces
router.get("/", async (req, res) => {
  const userId = req.userId!;

  const workspaces = await db
    .select({
      id: workspacesTable.id,
      name: workspacesTable.name,
      slug: workspacesTable.slug,
      ownerId: workspacesTable.ownerId,
      onboarded: workspacesTable.onboarded,
      createdAt: workspacesTable.createdAt,
    })
    .from(workspacesTable)
    .innerJoin(workspaceMembersTable, eq(workspacesTable.id, workspaceMembersTable.workspaceId))
    .where(and(eq(workspaceMembersTable.userId, userId), eq(workspaceMembersTable.status, "active")));

  res.json(workspaces);
});

// Create Workspace
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { name, slug } = CreateWorkspaceBody.parse(req.body);

  const workspace = await db.transaction(async tx => {
    const [created] = await tx.insert(workspacesTable).values({ name, slug, ownerId: userId }).returning();
    await tx.insert(workspaceMembersTable).values({ workspaceId: created.id, userId, role: "owner", email: req.userEmail || userId });
    return created;
  });

  res.status(201).json(workspace);
});

// List Members
router.get("/:id/members", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);

  const members = await db
    .select({ id: workspaceMembersTable.id, workspaceId: workspaceMembersTable.workspaceId,
      userId: workspaceMembersTable.userId, email: workspaceMembersTable.email,
      role: workspaceMembersTable.role, status: workspaceMembersTable.status,
      joinedAt: workspaceMembersTable.joinedAt, createdAt: workspaceMembersTable.createdAt })
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.workspaceId, workspaceId));

  res.json(members);
});

// Invite Member
router.post("/:id/invite", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  const { email, role } = InviteToWorkspaceBody.parse(req.body);

  const existingMember = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.email, email)
      )
    )
    .limit(1);

  if (existingMember.length > 0) {
    res.status(409).json({ error: "User is already a member of this workspace" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await db.transaction(async tx => {
    // Serialize invite creation per workspace, including the duplicate check.
    await tx.select({ id: workspacesTable.id }).from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId)).for("update");
    const [pending] = await tx.select({ id: workspaceMembersTable.id }).from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.email, email))).limit(1);
    if (pending) return null;
    const [created] = await tx.insert(workspaceInvitesTable).values({
      workspaceId, email, role, token, invitedBy: req.userId!, expiresAt,
    }).returning();
    await tx.insert(workspaceMembersTable).values({
      workspaceId, userId: "pending-" + token, email, role, status: "pending", inviteToken: token,
    });
    return created;
  });
  if (!invite) { res.status(409).json({ error: "User is already a member of this workspace" }); return; }

  res.status(201).json({
    id: invite.id,
    email,
    role,
    token,
    status: "pending",
    inviteUrl: `/accept-invite?token=${token}`,
  });
});

// Leave Workspace
router.post("/:id/leave", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  const userId = req.userId!;

  const [member] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId)
      )
    );

  if (!member) {
    res.status(404).json({ error: "Membership not found" });
    return;
  }

  if (member.role === "owner") {
    const ownerCount = await db
      .select({ count: count(workspaceMembersTable.id) })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.role, "owner")
        )
      );

    if (Number(ownerCount[0].count) <= 1) {
      res.status(400).json({ error: "Cannot leave workspace as the sole owner. Transfer ownership first." });
      return;
    }
  }

  await db
    .delete(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId)
      )
    );

  res.json({ message: "Successfully left the workspace" });
});

// Remove Member (owner/admin)
router.delete("/members/:memberId", async (req, res) => {
  const memberId = parseInt(req.params.memberId as string);
  const currentUserId = req.userId!;

  const [memberToRemove] = await db
    .select()
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.id, memberId));

  if (!memberToRemove) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [currentMember] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, memberToRemove.workspaceId),
        eq(workspaceMembersTable.userId, currentUserId),
        eq(workspaceMembersTable.status, "active")
      )
    );

  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
    res.status(403).json({ error: "Forbidden: Only owners and admins can remove members" });
    return;
  }

  if (memberToRemove.role === "owner") {
    res.status(400).json({ error: "Cannot remove an owner from the workspace" });
    return;
  }

  if (currentMember.role === "admin" && memberToRemove.role === "admin") {
    res.status(403).json({ error: "Admins cannot remove other admins" });
    return;
  }

  await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.id, memberId));

  res.json({ message: "Member removed successfully" });
});

// Accept Invite
router.post("/accept-invite", async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    res.status(400).json({ error: "A valid invite token is required" });
    return;
  }
  // The random invite token is a bearer capability. A signed-in account must
  // explicitly accept it; possession, not an unverified email claim, grants access.
  const result = await db.transaction(async tx => {
    const [invite] = await tx.select().from(workspaceInvitesTable)
      .where(eq(workspaceInvitesTable.token, token)).for("update");
    if (!invite || invite.status !== "pending" || invite.expiresAt <= new Date()) {
      return { status: 400, body: { error: "Invite is invalid, expired or already consumed" } };
    }
    // Serialize accepts for this workspace, including separate tokens for one user.
    await tx.select().from(workspacesTable).where(eq(workspacesTable.id, invite.workspaceId)).for("update");
    const [existing] = await tx.select().from(workspaceMembersTable).where(and(
      eq(workspaceMembersTable.workspaceId, invite.workspaceId), eq(workspaceMembersTable.userId, req.userId!)
    ));
    if (existing) return { status: 409, body: { error: "Account already has a membership in this workspace" } };
    const [member] = await tx.update(workspaceMembersTable)
      .set({ userId: req.userId!, email: invite.email, status: "active", inviteToken: null })
      .where(and(eq(workspaceMembersTable.inviteToken, token), eq(workspaceMembersTable.status, "pending")))
      .returning();
    if (!member) throw new Error("Pending invitation membership is missing");
    await tx.update(workspaceInvitesTable).set({ status: "accepted" }).where(eq(workspaceInvitesTable.id, invite.id));
    return { status: 200, body: { message: "Invite accepted", member } };
  });
  res.status(result.status).json(result.body);
});

// Get Workspace by invite token (for accept-invite page)
router.get("/invite/:token", async (req, res) => {
  const { token } = req.params;

  const [invite] = await db
    .select()
    .from(workspaceInvitesTable)
    .where(eq(workspaceInvitesTable.token, token));

  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, invite.workspaceId));

  res.json({
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    email: invite.email,
    status: invite.status,
    expiresAt: invite.expiresAt,
  });
});

// Update Workspace
router.patch("/:id", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);
  const { name, slug, onboarded } = UpdateWorkspaceBody.parse(req.body);

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

// Delete Workspace (owner only)
router.delete("/:id", requireWorkspaceMember(["owner"]), async (req, res) => {
  const workspaceId = parseInt(req.params.id as string);

  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId));

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db.delete(workspacesTable).where(eq(workspacesTable.id, workspaceId));

  res.json({ message: "Workspace deleted successfully" });
});

export default router;

import { Router } from "express";
import { db, expensesTable, projectsTable, subscriptionsTable, platformsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { isWorkspaceMember } from "../middlewares/auth";

const router = Router();

// Helper to validate project membership in a workspace
async function validateProjectInWorkspace(tx: any, projectId: number, workspaceId: number): Promise<boolean> {
  const [project] = await tx
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.workspaceId, workspaceId)));
  return !!project;
}

// Helper to validate platform membership in a workspace
async function validatePlatformInWorkspace(tx: any, platformId: number, workspaceId: number): Promise<boolean> {
  const [platform] = await tx
    .select()
    .from(platformsTable)
    .where(and(eq(platformsTable.id, platformId), eq(platformsTable.workspaceId, workspaceId)));
  return !!platform;
}

/**
 * PULL ENDPOINT (GET)
 * Returns all expenses, projects, and subscriptions created or updated after lastPulledAt.
 */
router.get("/", async (req, res, next) => {
  try {
    const rawWorkspaceId = req.query.workspaceId || req.headers["x-workspace-id"];
    if (!rawWorkspaceId) {
      res.status(400).json({ error: "Missing workspaceId" });
      return;
    }
    const workspaceId = parseInt(rawWorkspaceId as string);
    if (isNaN(workspaceId)) {
      res.status(400).json({ error: "Invalid workspaceId" });
      return;
    }

    // Verify tenant/workspace boundary checks
    const isMember = await isWorkspaceMember(workspaceId, req.userId!);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden: Not a member of this workspace" });
      return;
    }

    const { lastPulledAt } = req.query;
    let pullDate = new Date(0);
    if (lastPulledAt) {
      const parsedNumber = Number(lastPulledAt);
      if (!isNaN(parsedNumber) && parsedNumber > 0) {
        pullDate = new Date(parsedNumber);
      } else {
        const parsedIso = Date.parse(String(lastPulledAt));
        if (!isNaN(parsedIso)) {
          pullDate = new Date(parsedIso);
        }
      }
    }

    // Query databases for changes since pullDate
    const expenses = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.workspaceId, workspaceId), gt(expensesTable.createdAt, pullDate)));

    const projects = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.workspaceId, workspaceId), gt(projectsTable.createdAt, pullDate)));

    const subscriptions = await db
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.workspaceId, workspaceId), gt(subscriptionsTable.createdAt, pullDate)));

    const formattedExpenses = expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      createdAt: e.createdAt.toISOString(),
    }));

    const formattedProjects = projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    }));

    const formattedSubscriptions = subscriptions.map((s) => ({
      ...s,
      monthlyCost: s.monthlyCost ? Number(s.monthlyCost) : null,
      createdAt: s.createdAt.toISOString(),
    }));

    const serverTimestamp = Date.now();

    res.json({
      serverTimestamp,
      expenses: formattedExpenses,
      projects: formattedProjects,
      subscriptions: formattedSubscriptions,
      changes: {
        expenses: formattedExpenses,
        projects: formattedProjects,
        subscriptions: formattedSubscriptions,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUSH ENDPOINT (POST)
 * Accepts arrays of local changes made while offline and writes them transactionally.
 */
router.post("/", async (req, res, next) => {
  try {
    const rawWorkspaceId = req.query.workspaceId || req.headers["x-workspace-id"] || req.body?.workspaceId;
    if (!rawWorkspaceId) {
      res.status(400).json({ error: "Missing workspaceId" });
      return;
    }
    const workspaceId = parseInt(rawWorkspaceId as string);
    if (isNaN(workspaceId)) {
      res.status(400).json({ error: "Invalid workspaceId" });
      return;
    }

    // Verify tenant/workspace boundary checks
    const isMember = await isWorkspaceMember(workspaceId, req.userId!);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden: Not a member of this workspace" });
      return;
    }

    const changes = req.body.changes || req.body || {};
    const idMaps = {
      expenses: [] as { clientId: any; serverId: number }[],
      projects: [] as { clientId: any; serverId: number }[],
      subscriptions: [] as { clientId: any; serverId: number }[],
    };

    // Run all insertions and updates within a database transaction to ensure Atomicity
    await db.transaction(async (tx) => {
      // Helper to resolve project ID from mapping
      function resolveProjectId(clientIdOrServerId: any): number | null {
        if (!clientIdOrServerId) return null;
        const match = idMaps.projects.find((m) => String(m.clientId) === String(clientIdOrServerId));
        if (match) return match.serverId;
        return Number(clientIdOrServerId);
      }

      // 1. Process Projects first (so reference resolution works)
      if (changes.projects) {
        // Created
        for (const proj of changes.projects.created || []) {
          const clientId = proj.id;
          const { id, userId: _u, workspaceId: _w, createdAt: _c, ...insertData } = proj;
          const [inserted] = await tx
            .insert(projectsTable)
            .values({
              ...insertData,
              userId: req.userId!,
              workspaceId,
            })
            .returning();
          if (clientId) {
            idMaps.projects.push({ clientId, serverId: inserted.id });
          }
        }
        // Updated
        for (const proj of changes.projects.updated || []) {
          const { id, userId: _u, workspaceId: _w, createdAt: _c, ...updateData } = proj;
          if (!id) continue;
          await tx
            .update(projectsTable)
            .set(updateData)
            .where(and(eq(projectsTable.id, id), eq(projectsTable.workspaceId, workspaceId)));
        }
        // Deleted
        for (const id of changes.projects.deleted || []) {
          if (!id) continue;
          await tx
            .delete(projectsTable)
            .where(and(eq(projectsTable.id, id), eq(projectsTable.workspaceId, workspaceId)));
        }
      }

      // 2. Process Expenses
      if (changes.expenses) {
        // Created
        for (const exp of changes.expenses.created || []) {
          const clientId = exp.id;
          const { id, userId: _u, workspaceId: _w, createdAt: _c, projectId, platformId, ...insertData } = exp;

          const resolvedProjId = resolveProjectId(projectId);
          const resolvedPlatformId = platformId ? Number(platformId) : null;

          if (resolvedProjId) {
            const valid = await validateProjectInWorkspace(tx, resolvedProjId, workspaceId);
            if (!valid) throw new Error(`Project ${resolvedProjId} not found in workspace`);
          }
          if (resolvedPlatformId) {
            const valid = await validatePlatformInWorkspace(tx, resolvedPlatformId, workspaceId);
            if (!valid) throw new Error(`Platform ${resolvedPlatformId} not found in workspace`);
          }

          const [inserted] = await tx
            .insert(expensesTable)
            .values({
              ...insertData,
              amount: String(insertData.amount),
              userId: req.userId!,
              workspaceId,
              projectId: resolvedProjId,
              platformId: resolvedPlatformId,
            })
            .returning();

          if (clientId) {
            idMaps.expenses.push({ clientId, serverId: inserted.id });
          }
        }
        // Updated
        for (const exp of changes.expenses.updated || []) {
          const { id, userId: _u, workspaceId: _w, createdAt: _c, projectId, platformId, ...updateData } = exp;
          if (!id) continue;

          const resolvedProjId = resolveProjectId(projectId);
          const resolvedPlatformId = platformId ? Number(platformId) : null;

          if (resolvedProjId) {
            const valid = await validateProjectInWorkspace(tx, resolvedProjId, workspaceId);
            if (!valid) throw new Error(`Project ${resolvedProjId} not found in workspace`);
          }
          if (resolvedPlatformId) {
            const valid = await validatePlatformInWorkspace(tx, resolvedPlatformId, workspaceId);
            if (!valid) throw new Error(`Platform ${resolvedPlatformId} not found in workspace`);
          }

          const formattedUpdate: any = { ...updateData };
          if (updateData.amount !== undefined) formattedUpdate.amount = String(updateData.amount);
          if (projectId !== undefined) formattedUpdate.projectId = resolvedProjId;
          if (platformId !== undefined) formattedUpdate.platformId = resolvedPlatformId;

          await tx
            .update(expensesTable)
            .set(formattedUpdate)
            .where(and(eq(expensesTable.id, id), eq(expensesTable.workspaceId, workspaceId)));
        }
        // Deleted
        for (const id of changes.expenses.deleted || []) {
          if (!id) continue;
          await tx
            .delete(expensesTable)
            .where(and(eq(expensesTable.id, id), eq(expensesTable.workspaceId, workspaceId)));
        }
      }

      // 3. Process Subscriptions
      if (changes.subscriptions) {
        // Created
        for (const sub of changes.subscriptions.created || []) {
          const clientId = sub.id;
          const { id, userId: _u, workspaceId: _w, createdAt: _c, projectId, platformId, ...insertData } = sub;

          const resolvedProjId = resolveProjectId(projectId);
          const resolvedPlatformId = platformId ? Number(platformId) : null;

          if (resolvedProjId) {
            const valid = await validateProjectInWorkspace(tx, resolvedProjId, workspaceId);
            if (!valid) throw new Error(`Project ${resolvedProjId} not found in workspace`);
          }
          if (resolvedPlatformId) {
            const valid = await validatePlatformInWorkspace(tx, resolvedPlatformId, workspaceId);
            if (!valid) throw new Error(`Platform ${resolvedPlatformId} not found in workspace`);
          }

          const [inserted] = await tx
            .insert(subscriptionsTable)
            .values({
              ...insertData,
              monthlyCost: insertData.monthlyCost ? String(insertData.monthlyCost) : null,
              userId: req.userId!,
              workspaceId,
              projectId: resolvedProjId,
              platformId: resolvedPlatformId || undefined,
            })
            .returning();

          if (clientId) {
            idMaps.subscriptions.push({ clientId, serverId: inserted.id });
          }
        }
        // Updated
        for (const sub of changes.subscriptions.updated || []) {
          const { id, userId: _u, workspaceId: _w, createdAt: _c, projectId, platformId, ...updateData } = sub;
          if (!id) continue;

          const resolvedProjId = resolveProjectId(projectId);
          const resolvedPlatformId = platformId ? Number(platformId) : null;

          if (resolvedProjId) {
            const valid = await validateProjectInWorkspace(tx, resolvedProjId, workspaceId);
            if (!valid) throw new Error(`Project ${resolvedProjId} not found in workspace`);
          }
          if (resolvedPlatformId) {
            const valid = await validatePlatformInWorkspace(tx, resolvedPlatformId, workspaceId);
            if (!valid) throw new Error(`Platform ${resolvedPlatformId} not found in workspace`);
          }

          const formattedUpdate: any = { ...updateData };
          if (updateData.monthlyCost !== undefined) {
            formattedUpdate.monthlyCost = updateData.monthlyCost ? String(updateData.monthlyCost) : null;
          }
          if (projectId !== undefined) formattedUpdate.projectId = resolvedProjId;
          if (platformId !== undefined) formattedUpdate.platformId = resolvedPlatformId;

          await tx
            .update(subscriptionsTable)
            .set(formattedUpdate)
            .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.workspaceId, workspaceId)));
        }
        // Deleted
        for (const id of changes.subscriptions.deleted || []) {
          if (!id) continue;
          await tx
            .delete(subscriptionsTable)
            .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.workspaceId, workspaceId)));
        }
      }
    });

    res.json({
      success: true,
      idMaps,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to push offline sync changes" });
  }
});

export default router;

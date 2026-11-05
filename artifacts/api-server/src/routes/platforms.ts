import { resourceScope } from "../lib/resource-scope";
import { getWorkspaceMember } from "../middlewares/authz";
import { z } from "zod";
import { Router } from "express";
import { db, platformsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreatePlatformBody,
  UpdatePlatformBody,
  GetPlatformParams,
  UpdatePlatformParams,
  DeletePlatformParams,
} from "@workspace/api-zod";
import { encrypt } from "../lib/kms-vault";

const router = Router();

const MASK = "••••••••";
// Responses only signal whether a credential is stored. Provider sync is
// disabled for this release, so no endpoint decrypts or returns credentials.
const maskedKey = (stored: string | null) => (stored ? MASK : null);
// Mask characters (bullets/asterisks) are display placeholders, never credentials.
const isMaskPlaceholder = (value: string) => /^[\s•*·]+$/.test(value);

type CredentialResult = { ok: true; value: string | null | undefined } | { ok: false; error: string };
// undefined = leave unchanged, null = clear, string = replace (encrypted).
function credentialUpdate(raw: unknown): CredentialResult {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string" || raw.trim() === "" || isMaskPlaceholder(raw)) {
    return { ok: false, error: "apiKey must be a new credential, or null to clear it; omit it to keep the stored value" };
  }
  return { ok: true, value: encrypt(raw) };
}

router.get("/", async (req, res) => {
  const platforms = await db.select().from(platformsTable).where(resourceScope(platformsTable, req.userId!)).orderBy(platformsTable.name);
  res.json(platforms.map(p => ({ ...p, apiKey: maskedKey(p.apiKey), createdAt: p.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const body = CreatePlatformBody.parse(req.body);
  const { workspaceId = null } = z.object({ workspaceId: z.number().int().positive().nullable().optional() }).parse(req.body);
  if (workspaceId !== null) {
    const member = await getWorkspaceMember(workspaceId, req.userId!);
    if (!member || !["owner", "admin"].includes(member.role)) {
      res.status(403).json({ error: "Workspace write permission required" });
      return;
    }
  }
  const credential = credentialUpdate(req.body?.apiKey);
  if (!credential.ok) { res.status(400).json({ error: credential.error }); return; }
  const [platform] = await db.insert(platformsTable).values({ ...body, apiKey: credential.value ?? null, workspaceId, userId: req.userId! }).returning();
  res.status(201).json({ 
    ...platform, 
    apiKey: maskedKey(platform.apiKey),
    createdAt: platform.createdAt.toISOString() 
  });
});

router.get("/:id", async (req, res) => {
  const { id } = GetPlatformParams.parse({ id: Number(req.params.id) });
  const [platform] = await db.select().from(platformsTable).where(and(eq(platformsTable.id, id), resourceScope(platformsTable, req.userId!, req.method !== "GET")));
  if (!platform) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ 
    ...platform, 
    apiKey: maskedKey(platform.apiKey),
    createdAt: platform.createdAt.toISOString() 
  });
});

router.patch("/:id", async (req, res) => {
  if (req.body?.workspaceId !== undefined) { res.status(400).json({ error: "Workspace assignment is immutable" }); return; }
  const { id } = UpdatePlatformParams.parse({ id: Number(req.params.id) });
  const { apiKey: _rawKey, ...fields } = UpdatePlatformBody.parse(req.body);
  const credential = credentialUpdate(req.body?.apiKey);
  if (!credential.ok) { res.status(400).json({ error: credential.error }); return; }
  // Only an explicit replacement or null touches the stored credential.
  const changes = credential.value === undefined ? fields : { ...fields, apiKey: credential.value };
  if (Object.keys(changes).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [platform] = await db.update(platformsTable).set(changes).where(and(eq(platformsTable.id, id), resourceScope(platformsTable, req.userId!, req.method !== "GET"))).returning();
  if (!platform) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ 
    ...platform, 
    apiKey: maskedKey(platform.apiKey),
    createdAt: platform.createdAt.toISOString() 
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeletePlatformParams.parse({ id: Number(req.params.id) });
  const [deleted] = await db.delete(platformsTable).where(and(eq(platformsTable.id, id), resourceScope(platformsTable, req.userId!, true))).returning({ id: platformsTable.id });
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

// Provider sync (routes/sync.ts -> lib/sync-engine.ts, simulated adapters) is intentionally not
// mounted: it is disabled for launch and must not be reachable from an enabled route
// (enforced by scripts/mock-guard.mjs). See docs/governance/DEFERRED_WORK.md.

export default router;

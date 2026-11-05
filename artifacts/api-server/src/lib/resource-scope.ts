import { sql, type AnyColumn } from "drizzle-orm";

/** Personal records belong to their creator; shared records belong to active members. */
export function resourceScope(table: { userId: AnyColumn; workspaceId: AnyColumn }, userId: string, write = false) {
  return sql`((${table.workspaceId} IS NULL AND ${table.userId} = ${userId}) OR EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = ${table.workspaceId} AND m.user_id = ${userId}
      AND m.status = 'active' ${write ? sql`AND m.role IN ('owner', 'admin')` : sql``}
  ))`;
}

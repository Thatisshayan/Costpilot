import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { expensesTable, workspaceMembersTable } from "@workspace/db";

export function calcDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getDefaultWorkspaceId(userId: string): Promise<number> {
  const [member] = await db
    .select({ workspaceId: workspaceMembersTable.workspaceId })
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.userId, userId))
    .limit(1);
  return member?.workspaceId || 0;
}

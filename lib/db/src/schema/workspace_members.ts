import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const workspaceMembersTable = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "admin", "viewer"] }).default("viewer").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const workspaceMembersTable = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "admin", "viewer"] }).default("viewer").notNull(),
  email: text("email").notNull(),
  status: text("status", { enum: ["active", "pending", "expired"] }).default("active").notNull(),
  inviteToken: text("invite_token"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceInvitesTable = pgTable("workspace_invites", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "viewer"] }).default("viewer").notNull(),
  token: text("token").unique().notNull(),
  invitedBy: text("invited_by").notNull(),
  status: text("status", { enum: ["pending", "accepted", "expired"] }).default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import crypto from "crypto";

const INVITE_TOKEN = /^[a-f0-9]{64}$/;

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && INVITE_TOKEN.test(value);
}

// Invite tokens are bearer capabilities, so only a SHA-256 digest is stored.
export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

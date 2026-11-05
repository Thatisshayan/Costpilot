// Test-only stand-in for @clerk/react used by the local narrow-viewport smoke test.
// It is wired in only by e2e/vite.e2e.config.ts and is never part of a real build.
import type { ReactNode } from "react";

const session = { isLoaded: true, isSignedIn: true, userId: "e2e-owner", getToken: async () => "e2e-token" };
export function ClerkProvider({ children }: { children: ReactNode; publishableKey?: string }) { return <>{children}</>; }
export function useAuth() { return session; }
export function UserButton() { return <span aria-label="Account menu (test stub)">◉</span>; }
export function SignIn() { return null; }

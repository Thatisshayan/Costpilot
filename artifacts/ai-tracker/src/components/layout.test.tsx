import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@clerk/react", () => ({ UserButton: () => null }));
vi.mock("./workspace-switcher", () => ({ WorkspaceSwitcher: () => <div>switcher</div> }));
const health = vi.hoisted(() => ({ value: { isHealthy: true, isLoading: false } }));
vi.mock("@/hooks/use-health-check", () => ({ useHealthCheck: () => health.value }));

import { Layout, navigation } from "./layout";
import { launchPaths } from "@/lib/launch-scope";

afterEach(cleanup);

describe("navigation", () => {
  it("lists only live, routed screens", () => {
    const app = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");
    const routed = new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]));
    expect(navigation.map(n => n.name)).toEqual(["Dashboard", "Expenses", "Projects", "Vendors", "Team"]);
    for (const item of navigation) {
      expect(launchPaths.has(item.href)).toBe(true);
      expect(routed.has(item.href)).toBe(true);
    }
  });

  it("has no dead search, shortcut hints, theme switch or status claims", () => {
    render(<Layout><p>content</p></Layout>);
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /search/i })).toBeNull();
    expect(screen.queryByText(/⌘/)).toBeNull();
    expect(screen.queryByText(/light mode|dark mode/i)).toBeNull();
    expect(screen.queryByText(/all systems operational/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Team" })).toBeTruthy();
  });

  it("warns only when the API cannot be reached", () => {
    health.value = { isHealthy: false, isLoading: false };
    render(<Layout><p>content</p></Layout>);
    expect(screen.getByRole("status").textContent).toMatch(/cannot reach its server/i);
    health.value = { isHealthy: true, isLoading: false };
  });

  it("marks the current page and exposes the mobile menu state", () => {
    render(<Layout><p>content</p></Layout>);
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: /open navigation menu/i }).getAttribute("aria-expanded")).toBe("false");
  });
});

// Contract drift guard: every live API endpoint must be in lib/api-spec/openapi.yaml,
// and every spec operation that the launch scope blocks must be marked
// `x-costpilot-availability: disabled`, so the contract never overstates what is live.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { launchScope } from "../middlewares/launch-scope";

const root = resolve(__dirname, "../../../..");
const routesDir = resolve(__dirname, "../routes");
const METHODS = ["get", "post", "put", "patch", "delete"] as const;

// Server-to-server callbacks that are not part of the client API contract.
const NOT_IN_CONTRACT = new Map([
  ["POST /webhooks/clerk", "Clerk lifecycle webhook: signature-verified provider callback, not a client endpoint"],
]);

type Op = { key: string; disabled: boolean };

/** Minimal reader for the spec's fixed indentation (2-space paths, 4-space methods). */
export function specOperations(yaml: string): Op[] {
  const ops: Op[] = [];
  let path: string | null = null;
  let current: Op | null = null;
  for (const line of yaml.split("\n")) {
    if (/^components:/.test(line)) break;
    const p = line.match(/^ {2}(\/\S*):\s*$/);
    if (p) { path = p[1]; current = null; continue; }
    const m = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (m && path) { current = { key: `${m[1].toUpperCase()} ${normalize(path)}`, disabled: false }; ops.push(current); continue; }
    if (current && /^ {6}x-costpilot-availability:\s*disabled\s*(#.*)?$/.test(line)) current.disabled = true;
  }
  return ops;
}

/** Mounted routes from routes/index.ts and each router file's literal route declarations. */
export function mountedRoutes(): string[] {
  const index = readFileSync(resolve(routesDir, "index.ts"), "utf8");
  const imports = new Map([...index.matchAll(/import (\w+) from "\.\/(\w[\w-]*)"/g)].map(m => [m[1], m[2]]));
  const routes: string[] = [];
  for (const use of index.matchAll(/router\.use\((?:"([^"]*)",\s*)?(\w+)\)/g)) {
    const file = imports.get(use[2]);
    if (!file) continue; // middleware such as launchScope
    const source = readFileSync(resolve(routesDir, `${file}.ts`), "utf8");
    for (const r of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)) {
      const full = `${use[1] ?? ""}${r[2] === "/" ? "" : r[2]}` || "/";
      routes.push(`${r[1].toUpperCase()} ${normalize(full)}`);
    }
  }
  return routes;
}

function normalize(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}").replace(/:\w+/g, "{}").replace(/\/$/, "") || "/";
}

/** Runs the real launch-scope middleware for a concrete path. */
function isLive(key: string): boolean {
  const path = key.split(" ")[1].replace(/\{\}/g, "1");
  let passed = false;
  launchScope({ path } as Request,
    { status: () => ({ json: () => undefined }) } as unknown as Response,
    (() => { passed = true; }) as NextFunction);
  return passed;
}

const spec = specOperations(readFileSync(resolve(root, "lib/api-spec/openapi.yaml"), "utf8"));
const mounted = mountedRoutes();

describe("OpenAPI contract matches the live API", () => {
  it("parses a plausible number of operations and routes (fails closed on parser drift)", () => {
    expect(spec.length).toBeGreaterThan(40);
    expect(mounted.length).toBeGreaterThan(20);
    expect(new Set(spec.map(o => o.key)).size).toBe(spec.length);
  });

  it("documents every live mounted endpoint", () => {
    const documented = new Set(spec.filter(o => !o.disabled).map(o => o.key));
    const missing = mounted.filter(key => isLive(key) && !NOT_IN_CONTRACT.has(key) && !documented.has(key));
    expect(missing).toEqual([]);
  });

  it("marks every operation that is not live as disabled, and only those", () => {
    const live = new Set(mounted.filter(isLive));
    const unmarked = spec.filter(o => !o.disabled && !live.has(o.key)).map(o => o.key);
    const wronglyMarked = spec.filter(o => o.disabled && live.has(o.key)).map(o => o.key);
    expect(unmarked).toEqual([]);
    expect(wronglyMarked).toEqual([]);
  });

  it("detects a deliberately undocumented live route and an unmarked disabled operation", () => {
    const fakeSpec = specOperations([
      "paths:",
      "  /expenses:",
      "    get:",
      "      operationId: listExpenses",
      "  /analytics/forecast:",
      "    get:",
      "      operationId: getForecast",
      "components:",
    ].join("\n"));
    const documented = new Set(fakeSpec.filter(o => !o.disabled).map(o => o.key));
    expect(["POST /expenses"].filter(k => isLive(k) && !documented.has(k))).toEqual(["POST /expenses"]);
    expect(fakeSpec.filter(o => !o.disabled && !isLive(o.key)).map(o => o.key)).toEqual(["GET /analytics/forecast"]);
  });
});

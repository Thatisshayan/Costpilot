import type { Request, Response, NextFunction } from "express";

const core = new Set(["healthz", "expenses", "projects", "platforms", "workspaces", "exports", "spend", "budgets", "imports", "providers", "subscriptions"]);

export function launchScope(req: Request, res: Response, next: NextFunction) {
  const path = req.path.split("/").filter(Boolean);
  // Clerk lifecycle webhook remains independently signature-verified.
  if (core.has(path[0]) || (path[0] === "webhooks" && path[1] === "clerk")) {
    // Of the platform sub-routes, only real provider sync (/platforms/:id/sync) is enabled.
    if (path[0] === "platforms" && path.length > 2 && !(path.length === 3 && path[2] === "sync")) {
      res.status(503).json({ error: "FeatureUnavailable", message: "This platform feature is not enabled." });
      return;
    }
    return next();
  }
  res.status(503).json({ error: "FeatureUnavailable", message: "This preview feature is not enabled for launch." });
}

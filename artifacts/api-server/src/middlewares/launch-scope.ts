import type { Request, Response, NextFunction } from "express";

const core = new Set(["healthz", "expenses", "projects", "platforms", "workspaces", "exports"]);

export function launchScope(req: Request, res: Response, next: NextFunction) {
  const path = req.path.split("/").filter(Boolean);
  // Clerk lifecycle webhook remains independently signature-verified.
  if (core.has(path[0]) || (path[0] === "webhooks" && path[1] === "clerk")) {
    if (path[0] === "platforms" && path.length > 2) {
      res.status(503).json({ error: "FeatureUnavailable", message: "Provider sync is not enabled for launch." });
      return;
    }
    return next();
  }
  res.status(503).json({ error: "FeatureUnavailable", message: "This preview feature is not enabled for launch." });
}

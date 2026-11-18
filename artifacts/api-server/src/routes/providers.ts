import { Router } from "express";
import { providerCatalog } from "../lib/provider-sync/registry";

const router = Router();

router.get("/", (_req, res) => {
  res.json(providerCatalog());
});

export default router;

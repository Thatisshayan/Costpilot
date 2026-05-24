import { Router } from "express";
import { syncPlatform } from "../lib/sync-engine";

const router = Router({ mergeParams: true });

router.post("/sync", async (req, res) => {
  const id = Number(req.params.id);
  const result = await syncPlatform(id, req.userId!);
  
  if (!result.success) {
    // If it's a 404 or logic error, we still return 200 with success:false for the UI to show a toast
    return res.json(result);
  }
  
  res.json(result);
});

export default router;

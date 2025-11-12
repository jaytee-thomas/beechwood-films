import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { enqueueVideoJob, getRecentJobs } from "../queues/videoQueue.js";

export const router = Router();

router.post("/queues/video/recompute", requireAdmin, async (req, res, next) => {
  try {
    const { id = null } = req.body || {};
    const user = req.auth?.session?.user;
    const payload = {
      id,
      triggeredBy: user?.email ?? null,
      ts: Date.now()
    };
    const result = await enqueueVideoJob({
      type: "recomputeVideoSignals",
      payload,
      requestedBy: user?.email,
      requestedById: user?.id,
      videoId: id
    });
    res.status(202).json({
      enqueued: true,
      jobId: result.jobId,
      mode: result.mode
    });
  } catch (error) {
    next(error);
  }
});

router.get("/queues/jobs/recent", requireAdmin, async (_req, res, next) => {
  try {
    const jobs = await getRecentJobs({ limit: 50 });
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

export default router;

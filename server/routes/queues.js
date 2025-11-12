import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { enqueueVideoJob, isVideoQueueInline } from "../queues/videoQueue.js";

export const router = Router();

router.post("/queues/video/recompute", requireAdmin, async (req, res, next) => {
  try {
    const { id = null } = req.body || {};
    const userEmail = req.auth?.session?.user?.email ?? null;
    const payload = {
      id,
      triggeredBy: userEmail,
      ts: Date.now()
    };
    const job = await enqueueVideoJob("recomputeVideoSignals", payload);
    res.status(202).json({
      enqueued: true,
      jobId: job?.id ?? null,
      mode: isVideoQueueInline() ? "inline" : "queue"
    });
  } catch (error) {
    next(error);
  }
});

export default router;

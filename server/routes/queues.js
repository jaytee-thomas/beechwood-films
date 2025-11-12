import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { enqueueVideoJob, getRecentJobs } from "../queues/videoQueue.js";
import { getQueueMetrics, getRecentJobDurations } from "../db/jobMetrics.js";
import { bus } from "../lib/events.js";

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

router.get("/queues/jobs/metrics", requireAdmin, async (_req, res) => {
  try {
    const metrics = await getQueueMetrics();
    const recent = await getRecentJobDurations(25);
    res.json({ metrics, recent });
  } catch (error) {
    console.error("[queues:metrics] error", error);
    res.status(500).json({ error: "metrics_failed" });
  }
});

router.get("/queues/jobs/stream", requireAdmin, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const heartbeat = setInterval(() => send("ping", { at: Date.now() }), 25000);
  const listener = (payload) => send("job", payload);
  bus.on("job:event", listener);
  send("hello", { ok: true, at: Date.now() });

  req.on("close", () => {
    clearInterval(heartbeat);
    bus.off("job:event", listener);
  });
});

export default router;

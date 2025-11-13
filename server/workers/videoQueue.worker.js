import pkg from "bullmq";
const { Worker } = pkg;
import IORedis from "ioredis";
import { getRedisConfig } from "../lib/redis.js";
import {
  logStarted,
  logProgress,
  logCompleted,
  logFailed
} from "../db/videoJobs.js";
import { bus } from "../lib/events.js";
import { processVideoJob } from "./processVideoJob.js";

const cfg = getRedisConfig();
if (!cfg.enabled || !cfg.url) {
  console.log("[videoQueue] Redis not configured; worker exiting.");
  process.exit(0);
}

const connection = new IORedis(cfg.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

const emit = (phase, payload) => {
  bus.emit("job:event", { phase, at: Date.now(), ...payload });
};

const worker = new Worker(
  "video",
  async (job) => {
    const meta = {
      jobId: String(job.id),
      type: job.name,
      videoId: job.data?.videoId ?? null,
      requestedBy: job.data?.requestedBy ?? null,
      requestedById: job.data?.requestedById ?? null
    };

    await logStarted({ jobId: meta.jobId, attempts: job.attemptsMade + 1 });
    emit("started", meta);

    const progressHandler = async (pct) => {
      const progress = Math.max(0, Math.min(100, Math.round((Number(pct) || 0) * 100)));
      await logProgress({ jobId: meta.jobId, progress });
      emit("progress", { ...meta, progress });
      await job.updateProgress(progress);
    };

    const result = await processVideoJob(job, { onProgress: progressHandler });
    await logCompleted({ jobId: meta.jobId, result });
    emit("completed", { ...meta, result });
    return result;
  },
  {
    connection,
    concurrency: Number(process.env.VIDEO_QUEUE_CONCURRENCY || 3),
    lockDuration: 60_000,
    maxStalledCount: 2
  }
);

worker.on("failed", async (job, err) => {
  const meta = {
    jobId: job?.id ? String(job.id) : null,
    type: job?.name,
    videoId: job?.data?.videoId ?? null,
    requestedBy: job?.data?.requestedBy ?? null,
    requestedById: job?.data?.requestedById ?? null
  };
  await logFailed({ jobId: meta.jobId, error: err });
  emit("failed", { ...meta, error: err?.message || "unknown_error" });
  console.error("[videoQueue] job failed:", job?.id, err);
});

worker.on("completed", (job) => {
  console.log("[videoQueue] job completed:", job?.id);
});

console.log("[videoQueue.worker] started with concurrency=3");

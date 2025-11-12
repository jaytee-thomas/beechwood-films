import { Worker } from "bullmq";
import { getRedisConnection, isRedisEnabled } from "../lib/redis.js";
import {
  logStarted,
  logProgress,
  logCompleted,
  logFailed
} from "../db/videoJobs.js";
import { processVideoJob } from "./processVideoJob.js";

const QUEUE_NAME = "video";

if (!isRedisEnabled()) {
  console.log("[videoQueue] Redis not configured; worker exiting.");
  process.exit(0);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const jobId = String(job.id);
    const startedAt = Date.now();
    await logStarted({
      jobId,
      jobType: job.name,
      startedAt
    });

    const onProgress = async (p) => {
      try {
        await logProgress({
          jobId,
          progress: Math.floor((Number(p) || 0) * 100)
        });
      } catch (error) {
        console.warn("[videoQueue] failed to log progress", error);
      }
      await job.updateProgress(Math.round((Number(p) || 0) * 100));
    };

    try {
      const result = await processVideoJob(job.data, { jobId, onProgress });
      await logCompleted({
        jobId,
        startedAt,
        result
      });
      return result;
    } catch (error) {
      await logFailed({
        jobId,
        startedAt,
        error
      });
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
    lockDuration: 60_000,
    maxStalledCount: 2
  }
);

worker.on("completed", (job) => {
  console.log("[videoQueue] job completed:", job?.id);
});

worker.on("failed", (job, err) => {
  console.error("[videoQueue] job failed:", job?.id, err);
});

console.log("[videoQueue] worker online with concurrency=3");

import { Worker } from "bullmq";
import { redisConnection, isRedisEnabled } from "../lib/redis.js";
import { videoQueueName } from "../queues/videoQueue.js";
import { processVideoJob } from "./processVideoJob.js";
import {
  logStarted,
  logProgress,
  logCompleted,
  logFailed
} from "../db/videoJobs.js";

if (!isRedisEnabled) {
  console.warn("[videoQueue] Redis not configured; worker exiting.");
  process.exit(0);
}

const concurrency = Number(process.env.VIDEO_QUEUE_CONCURRENCY || 2);

const worker = new Worker(
  videoQueueName,
  async (job) => {
    await logStarted({ jobId: job.id, attempts: job.attemptsMade + 1 });
    const startedAt = Date.now();
    try {
      const result = await processVideoJob(job.data, { jobId: job.id });
      await logCompleted({ jobId: job.id, startedAt, result });
      return result;
    } catch (error) {
      await logFailed({ jobId: job.id, startedAt, error });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency
  }
);

worker.on("completed", (job) => {
  console.log(`[videoQueue] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[videoQueue] job ${job?.id} failed`, err);
});

worker.on("progress", async (job, progress) => {
  try {
    await logProgress({ jobId: job.id, progress });
  } catch (error) {
    console.warn("[videoQueue] failed to log progress", error);
  }
});

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import { Worker } from "bullmq";
import { redisConnection, isRedisEnabled } from "../lib/redis.js";
import { videoQueueName } from "../queues/videoQueue.js";
import { processVideoJob } from "./processVideoJob.js";

if (!isRedisEnabled) {
  console.warn("[videoQueue] Redis not configured; worker exiting.");
  process.exit(0);
}

const concurrency = Number(process.env.VIDEO_QUEUE_CONCURRENCY || 2);

const worker = new Worker(videoQueueName, processVideoJob, {
  connection: redisConnection,
  concurrency
});

worker.on("completed", (job) => {
  console.log(`[videoQueue] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[videoQueue] job ${job?.id} failed`, err);
});

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

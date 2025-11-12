#!/usr/bin/env node
import { QueueEvents } from "bullmq";
import { addVideoJob, videoQueueName, isVideoQueueInline } from "../queues/videoQueue.js";
import { redisConnection } from "../lib/redis.js";

const run = async () => {
  const jobPayload = {
    type: "smoke",
    at: new Date().toISOString()
  };

  if (isVideoQueueInline()) {
    console.log("[queue:smoke] Redis not configured, running inline.");
    await addVideoJob("smoke", jobPayload);
    console.log("[queue:smoke] Inline processing complete.");
    return;
  }

  const queueEvents = new QueueEvents(videoQueueName, { connection: redisConnection });
  await queueEvents.waitUntilReady();

  console.log("[queue:smoke] queue ready, enqueueing job...");
  const job = await addVideoJob("smoke", jobPayload, { removeOnComplete: true });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      queueEvents.removeAllListeners();
      reject(new Error("job completion timeout"));
    }, Number(process.env.WEBHOOK_TIMEOUT_MS || 4000));

    queueEvents.on("completed", ({ jobId }) => {
      if (jobId === job.id) {
        clearTimeout(timeout);
        queueEvents.removeAllListeners();
        console.log("[queue:smoke] job completed:", jobId);
        resolve();
      }
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      if (jobId === job.id) {
        clearTimeout(timeout);
        queueEvents.removeAllListeners();
        reject(new Error(`job failed: ${failedReason}`));
      }
    });
  });

  await queueEvents.close();
};

run()
  .then(() => {
    console.log("[queue:smoke] success ✅");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[queue:smoke] failed ❌", err);
    process.exit(1);
  });

#!/usr/bin/env node
import { QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { enqueueVideoJob, videoQueueName, isVideoQueueInline } from "../queues/videoQueue.js";
import { getRedisConfig } from "../lib/redis.js";

const run = async () => {
  const jobPayload = {
    type: "smoke",
    at: new Date().toISOString()
  };

  if (isVideoQueueInline()) {
    console.log("[queue:smoke] Redis not configured, running inline.");
    await enqueueVideoJob({ type: "smoke", payload: jobPayload });
    console.log("[queue:smoke] Inline processing complete.");
    return;
  }

  const cfg = getRedisConfig();
  if (!cfg.enabled || !cfg.url) {
    console.error("[queue:smoke] Redis config missing");
    process.exit(1);
  }

  const queueEvents = new QueueEvents(videoQueueName, {
    connection: new IORedis(cfg.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    })
  });
  await queueEvents.waitUntilReady();

  console.log("[queue:smoke] queue ready, enqueueing job...");
  const { jobId } = await enqueueVideoJob({
    type: "smoke",
    payload: jobPayload,
    queueOptions: { removeOnComplete: 100 }
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      queueEvents.removeAllListeners();
      reject(new Error("job completion timeout"));
    }, Number(process.env.WEBHOOK_TIMEOUT_MS || 4000));

    queueEvents.on("completed", ({ jobId: completedId }) => {
      if (completedId === jobId) {
        clearTimeout(timeout);
        queueEvents.removeAllListeners();
        console.log("[queue:smoke] job completed:", completedId);
        resolve();
      }
    });

    queueEvents.on("failed", ({ jobId: failedId, failedReason }) => {
      if (failedId === jobId) {
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

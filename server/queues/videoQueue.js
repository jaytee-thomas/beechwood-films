import { Queue } from "bullmq";
import {
  getRedisConnection,
  isRedisEnabled
} from "../lib/redis.js";
import {
  logEnqueued,
  logStarted,
  logCompleted,
  logFailed,
  getRecent
} from "../db/videoJobs.js";
import { processVideoJob } from "../workers/processVideoJob.js";

const QUEUE_NAME = "video";
let queue = null;

export const videoQueueName = QUEUE_NAME;

export const getVideoQueue = () => {
  if (queue) return queue;
  if (!isRedisEnabled()) return null;

  queue = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
      timeout: 15 * 60 * 1000
    }
  });
  return queue;
};

export const isVideoQueueInline = () => !isRedisEnabled();

export const enqueueVideoJob = async ({
  type = "recomputeVideoSignals",
  payload = {},
  requestedBy,
  requestedById,
  videoId = null,
  queueOptions = {}
} = {}) => {
  const enrichedPayload = { ...payload, videoId };
  const q = getVideoQueue();

  if (q) {
    const job = await q.add(
      type,
      enrichedPayload,
      Object.assign(
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 }
        },
        queueOptions
      )
    );
    const jobId = String(job.id);
    await logEnqueued({
      jobId,
      jobType: type,
      requestedBy,
      requestedById,
      videoId,
      payload: enrichedPayload
    });
    return { mode: "queue", jobId, job };
  }

  const syntheticId = `inline:${Date.now()}`;
  await logEnqueued({
    jobId: syntheticId,
    jobType: type,
    requestedBy,
    requestedById,
    videoId,
    payload: enrichedPayload
  });
  await logStarted({ jobId: syntheticId, attempts: 1 });
  const startedAt = Date.now();
  try {
    const result = await processVideoJob(enrichedPayload, {
      jobId: syntheticId,
      inline: true
    });
    await logCompleted({ jobId: syntheticId, startedAt, result });
    return { mode: "inline", jobId: syntheticId, result };
  } catch (error) {
    await logFailed({ jobId: syntheticId, startedAt, error });
    throw error;
  }
};

export const addVideoJob = enqueueVideoJob;
export const getRecentJobs = getRecent;
